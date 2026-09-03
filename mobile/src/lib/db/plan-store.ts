import { getDb } from './database';
import { newId } from './ids';
import type { SessionExercise } from '@/features/set-loop/types';

// Reads and writes the plan tables (data-model §2: Plan → PlanDay → PlanExercise). The
// session boots from here; the plan builder writes here. Until mesocycles track which
// day is next, the active plan's first day is the day.

export type ProgressionStrategy = 'steady' | 'reps-first' | 'by-feel';

export type ActiveDay = {
  planName: string;
  dayId: string;
  dayName: string;
  exercises: SessionExercise[];
};

/** One plan_exercises row with the plan default already resolved into `strategy`. */
export type PlanExerciseRow = {
  exercise_id: string;
  name: string;
  sets: number;
  reps: number;
  start_weight: number;
  rest_seconds: number;
  auto_start_timer: number;
  strategy: string | null;
  rep_ceiling: number | null;
};

const EXERCISE_COLUMNS = `pe.exercise_id, pe.name, pe.sets, pe.reps, pe.start_weight, pe.rest_seconds,
  pe.auto_start_timer, COALESCE(pe.strategy, p.progression_default) AS strategy, pe.rep_ceiling`;

export function loadActiveDay(): ActiveDay | null {
  const db = getDb();
  const day = db.getFirstSync<{ id: string; name: string; plan_name: string }>(
    `SELECT d.id, d.name, p.name AS plan_name
     FROM plan_days d JOIN plans p ON p.id = d.plan_id
     WHERE p.is_active = 1
     ORDER BY d.day_order ASC LIMIT 1`,
  );
  if (!day) return null;
  const rows = db.getAllSync<PlanExerciseRow>(
    `SELECT ${EXERCISE_COLUMNS}
     FROM plan_exercises pe JOIN plan_days d ON d.id = pe.plan_day_id JOIN plans p ON p.id = d.plan_id
     WHERE pe.plan_day_id = ? ORDER BY pe.exercise_order ASC`,
    [day.id],
  );
  if (rows.length === 0) return null;
  return {
    planName: day.plan_name,
    dayId: day.id,
    dayName: day.name,
    exercises: sessionExercisesFrom(rows),
  };
}

/** Pure mapping from plan rows to what the machine starts with — the testable part.
 *  `strategy` arrives resolved (a null override already replaced by the plan default). */
export function sessionExercisesFrom(rows: PlanExerciseRow[]): SessionExercise[] {
  return rows.map((r) => ({
    exerciseId: r.exercise_id,
    name: r.name,
    prescribedSets: r.sets,
    targetReps: r.reps,
    weight: r.start_weight,
    restSeconds: r.rest_seconds,
    autoStartTimer: r.auto_start_timer === 1,
    ...(r.strategy === 'by-feel' || r.strategy === 'reps-first' ? { strategy: r.strategy } : {}),
    ...(r.strategy === 'reps-first' && r.rep_ceiling !== null ? { repCeiling: r.rep_ceiling } : {}),
  }));
}

/** How many plans exist — feeds the "Plan N" name suggestion (Figma 114:3014). */
export function countPlans(): number {
  const row = getDb().getFirstSync<{ n: number }>('SELECT count(*) AS n FROM plans');
  return row?.n ?? 0;
}

/** The builder's first write: a new, inactive plan with its first day. It becomes the
 *  active plan when the builder saves it (data-model §2 Plan.source = built). */
export function createPlan(
  input: { name: string; progressionDefault: ProgressionStrategy },
  now: number,
): { planId: string; dayId: string } {
  const planId = newId();
  const dayId = newId();
  const db = getDb();
  db.withTransactionSync(() => {
    db.runSync(
      `INSERT INTO plans (id, name, source, progression_default, is_active, created_at, updated_at)
       VALUES (?, ?, 'built', ?, 0, ?, ?)`,
      [planId, input.name, input.progressionDefault, now, now],
    );
    db.runSync('INSERT INTO plan_days (id, plan_id, day_order, name) VALUES (?, ?, 0, ?)', [
      dayId,
      planId,
      'Day 1',
    ]);
  });
  return { planId, dayId };
}

// --- The builder's view of one day -------------------------------------------------

export type DayExercise = {
  id: string;
  exerciseId: string;
  name: string;
  sets: number;
  reps: number;
  startWeight: number;
  restSeconds: number;
  /** Resolved: the override if set, else the plan default. */
  strategy: ProgressionStrategy;
  /** True when this lift overrides the plan's progression (Day Summary badge). */
  overridesProgression: boolean;
  repCeiling: number | null;
  muscles: string[];
};

export type BuilderDay = {
  planId: string;
  planName: string;
  planStrategy: ProgressionStrategy;
  dayId: string;
  dayName: string;
  exercises: DayExercise[];
};

export function loadDay(dayId: string): BuilderDay | null {
  const db = getDb();
  const day = db.getFirstSync<{
    id: string;
    name: string;
    plan_id: string;
    plan_name: string;
    plan_strategy: string;
  }>(
    `SELECT d.id, d.name, p.id AS plan_id, p.name AS plan_name, p.progression_default AS plan_strategy
     FROM plan_days d JOIN plans p ON p.id = d.plan_id WHERE d.id = ?`,
    [dayId],
  );
  if (!day) return null;
  const rows = db.getAllSync<{
    id: string;
    exercise_id: string;
    name: string;
    sets: number;
    reps: number;
    start_weight: number;
    rest_seconds: number;
    strategy: string | null;
    rep_ceiling: number | null;
    muscle_groups: string | null;
  }>(
    `SELECT pe.id, pe.exercise_id, pe.name, pe.sets, pe.reps, pe.start_weight, pe.rest_seconds,
            pe.strategy, pe.rep_ceiling, e.muscle_groups
     FROM plan_exercises pe LEFT JOIN exercises e ON e.id = pe.exercise_id
     WHERE pe.plan_day_id = ? ORDER BY pe.exercise_order ASC`,
    [dayId],
  );
  const planStrategy = day.plan_strategy as ProgressionStrategy;
  return {
    planId: day.plan_id,
    planName: day.plan_name,
    planStrategy,
    dayId: day.id,
    dayName: day.name,
    exercises: rows.map((r) => ({
      id: r.id,
      exerciseId: r.exercise_id,
      name: r.name,
      sets: r.sets,
      reps: r.reps,
      startWeight: r.start_weight,
      restSeconds: r.rest_seconds,
      strategy: (r.strategy as ProgressionStrategy | null) ?? planStrategy,
      overridesProgression: r.strategy !== null && r.strategy !== planStrategy,
      repCeiling: r.rep_ceiling,
      muscles: (r.muscle_groups ?? '').split(',').filter(Boolean),
    })),
  };
}

export type NewPlanExercise = {
  exerciseId: string;
  name: string;
  sets: number;
  reps: number;
  startWeight: number;
  restSeconds: number;
  /** null = inherit the plan default. */
  repCeiling: number | null;
};

/** Add to Day (Figma 123:1092): one more row at the end of the day. */
export function addPlanExercise(dayId: string, input: NewPlanExercise): string {
  const db = getDb();
  const last = db.getFirstSync<{ n: number }>(
    'SELECT count(*) AS n FROM plan_exercises WHERE plan_day_id = ?',
    [dayId],
  );
  const id = newId();
  db.runSync(
    `INSERT INTO plan_exercises (id, plan_day_id, exercise_id, exercise_order, name, sets, reps, start_weight, rest_seconds, auto_start_timer, strategy, rep_ceiling)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, ?)`,
    [
      id,
      dayId,
      input.exerciseId,
      last?.n ?? 0,
      input.name,
      input.sets,
      input.reps,
      input.startWeight,
      input.restSeconds,
      input.repCeiling,
    ],
  );
  return id;
}

/** Save Day: this plan becomes the one Start Workout runs. One active plan at a time. */
export function activatePlan(planId: string, now: number) {
  const db = getDb();
  db.withTransactionSync(() => {
    db.runSync('UPDATE plans SET is_active = 0 WHERE is_active = 1');
    db.runSync('UPDATE plans SET is_active = 1, updated_at = ? WHERE id = ?', [now, planId]);
  });
}
