import { getDb } from './database';
import { newId } from './ids';
import type { SessionExercise } from '@/features/set-loop/types';

// Reads and writes the plan tables (data-model §2: Plan → PlanDay → PlanExercise). The
// session boots from here; the plan builder writes here. The active plan's days rotate:
// `next_day_order` says which one Start Workout runs, finishing a workout advances it, and
// Change It Up (home, or the watch) points it at a chosen day.

export type ProgressionStrategy = 'steady' | 'reps-first' | 'by-feel';

export type ActiveDay = {
  planName: string;
  dayId: string;
  dayName: string;
  exercises: SessionExercise[];
};

/** One plan_exercises row with the plan default already resolved into `strategy`, and
 *  the plan's own default beside it so an override can still be told apart. */
export type PlanExerciseRow = {
  exercise_id: string;
  name: string;
  sets: number;
  reps: number;
  start_weight: number;
  rest_seconds: number;
  auto_start_timer: number;
  strategy: string | null;
  plan_strategy: string;
  rep_ceiling: number | null;
};

const EXERCISE_COLUMNS = `pe.exercise_id, pe.name, pe.sets, pe.reps, pe.start_weight, pe.rest_seconds,
  pe.auto_start_timer, COALESCE(pe.strategy, p.progression_default) AS strategy,
  p.progression_default AS plan_strategy, pe.rep_ceiling`;

/** One day of the active plan, as Start Workout would run it. `isNext` marks the day the
 *  rotation points at — the one Start Workout runs, and "Current" on the watch's Change
 *  It Up (164:4192). */
export type ActivePlanDay = {
  dayId: string;
  order: number;
  name: string;
  isNext: boolean;
  exercises: SessionExercise[];
};

export type ActivePlan = { planId: string; planName: string; days: ActivePlanDay[] };

/** The active plan and every one of its days. Exactly one day is next: the rotation's,
 *  or the first when the pointer is stale (a day removed after it was pointed at). */
export function loadActivePlan(): ActivePlan | null {
  const db = getDb();
  const plan = db.getFirstSync<{ id: string; name: string; next_day_order: number }>(
    'SELECT id, name, next_day_order FROM plans WHERE is_active = 1 LIMIT 1',
  );
  if (!plan) return null;
  const days = db.getAllSync<{ id: string; day_order: number; name: string }>(
    'SELECT id, day_order, name FROM plan_days WHERE plan_id = ? ORDER BY day_order ASC',
    [plan.id],
  );
  if (days.length === 0) return null;
  const nextOrder = days.some((d) => d.day_order === plan.next_day_order)
    ? plan.next_day_order
    : days[0].day_order;
  return {
    planId: plan.id,
    planName: plan.name,
    days: days.map((d) => ({
      dayId: d.id,
      order: d.day_order,
      name: d.name,
      isNext: d.day_order === nextOrder,
      exercises: sessionExercisesFrom(
        db.getAllSync<PlanExerciseRow>(
          `SELECT ${EXERCISE_COLUMNS}
           FROM plan_exercises pe JOIN plan_days d ON d.id = pe.plan_day_id JOIN plans p ON p.id = d.plan_id
           WHERE pe.plan_day_id = ? ORDER BY pe.exercise_order ASC`,
          [d.id],
        ),
      ),
    })),
  };
}

/** The day Start Workout runs; null when there is no plan or the day has no lifts. */
export function loadActiveDay(): ActiveDay | null {
  const plan = loadActivePlan();
  const day = plan?.days.find((d) => d.isNext);
  if (!plan || !day || day.exercises.length === 0) return null;
  return { planName: plan.planName, dayId: day.dayId, dayName: day.name, exercises: day.exercises };
}

/** Change It Up: this day is the one Start Workout runs next — chosen on the phone's
 *  home or from the watch (164:4192). */
export function setNextDay(dayId: string) {
  getDb().runSync(
    'UPDATE plans SET next_day_order = (SELECT day_order FROM plan_days WHERE id = ?) WHERE id = (SELECT plan_id FROM plan_days WHERE id = ?)',
    [dayId, dayId],
  );
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
    // The same rule as the builder's Day Summary badge: an override is a strategy of
    // its own, not the plan's default written out.
    ...(r.strategy !== null && r.strategy !== r.plan_strategy
      ? { overridesProgression: true }
      : {}),
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

// --- Editing a day before it's saved -------------------------------------------------

export type StoredPlanExercise = NewPlanExercise & { id: string; dayId: string };

export function loadPlanExercise(id: string): StoredPlanExercise | null {
  const r = getDb().getFirstSync<{
    id: string;
    plan_day_id: string;
    exercise_id: string;
    name: string;
    sets: number;
    reps: number;
    start_weight: number;
    rest_seconds: number;
    rep_ceiling: number | null;
  }>(
    'SELECT id, plan_day_id, exercise_id, name, sets, reps, start_weight, rest_seconds, rep_ceiling FROM plan_exercises WHERE id = ?',
    [id],
  );
  if (!r) return null;
  return {
    id: r.id,
    dayId: r.plan_day_id,
    exerciseId: r.exercise_id,
    name: r.name,
    sets: r.sets,
    reps: r.reps,
    startWeight: r.start_weight,
    restSeconds: r.rest_seconds,
    repCeiling: r.rep_ceiling,
  };
}

/** Tapping a Day Summary row reopens the lift; Save Changes writes it back in place. */
export function updatePlanExercise(id: string, input: NewPlanExercise) {
  getDb().runSync(
    `UPDATE plan_exercises SET sets = ?, reps = ?, start_weight = ?, rest_seconds = ?, rep_ceiling = ?
     WHERE id = ?`,
    [input.sets, input.reps, input.startWeight, input.restSeconds, input.repCeiling, id],
  );
}

/** The row's ✕: gone, and the rows after it close the gap. */
export function removePlanExercise(id: string) {
  const db = getDb();
  const row = db.getFirstSync<{ plan_day_id: string; exercise_order: number }>(
    'SELECT plan_day_id, exercise_order FROM plan_exercises WHERE id = ?',
    [id],
  );
  if (!row) return;
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM plan_exercises WHERE id = ?', [id]);
    db.runSync(
      'UPDATE plan_exercises SET exercise_order = exercise_order - 1 WHERE plan_day_id = ? AND exercise_order > ?',
      [row.plan_day_id, row.exercise_order],
    );
  });
}

/** Drag-reorder: the day's rows in their new order (every id of the day, once). */
export function reorderPlanExercises(dayId: string, orderedIds: string[]) {
  const db = getDb();
  db.withTransactionSync(() => {
    orderedIds.forEach((id, i) => {
      db.runSync('UPDATE plan_exercises SET exercise_order = ? WHERE id = ? AND plan_day_id = ?', [
        i,
        id,
        dayId,
      ]);
    });
  });
}

// --- The plan as a whole (Plan Summary, day rotation) ---------------------------------

export type PlanDaySummary = {
  id: string;
  order: number;
  name: string;
  exerciseNames: string[];
};

export type BuilderPlan = {
  id: string;
  name: string;
  strategy: ProgressionStrategy;
  isActive: boolean;
  nextDayOrder: number;
  days: PlanDaySummary[];
};

export function loadPlan(planId: string): BuilderPlan | null {
  const db = getDb();
  const p = db.getFirstSync<{
    id: string;
    name: string;
    progression_default: string;
    is_active: number;
    next_day_order: number;
  }>('SELECT id, name, progression_default, is_active, next_day_order FROM plans WHERE id = ?', [
    planId,
  ]);
  if (!p) return null;
  const days = db.getAllSync<{ id: string; day_order: number; name: string }>(
    'SELECT id, day_order, name FROM plan_days WHERE plan_id = ? ORDER BY day_order ASC',
    [planId],
  );
  return {
    id: p.id,
    name: p.name,
    strategy: p.progression_default as ProgressionStrategy,
    isActive: p.is_active === 1,
    nextDayOrder: p.next_day_order,
    days: days.map((d) => ({
      id: d.id,
      order: d.day_order,
      name: d.name,
      exerciseNames: db
        .getAllSync<{ name: string }>(
          'SELECT name FROM plan_exercises WHERE plan_day_id = ? ORDER BY exercise_order ASC',
          [d.id],
        )
        .map((r) => r.name),
    })),
  };
}

/** Add Day (Figma 123:2530): "Day N" at the end. */
export function addPlanDay(planId: string): string {
  const db = getDb();
  const n = db.getFirstSync<{ n: number }>(
    'SELECT count(*) AS n FROM plan_days WHERE plan_id = ?',
    [planId],
  );
  const order = n?.n ?? 0;
  const id = newId();
  db.runSync('INSERT INTO plan_days (id, plan_id, day_order, name) VALUES (?, ?, ?, ?)', [
    id,
    planId,
    order,
    `Day ${order + 1}`,
  ]);
  return id;
}

/** A day's ✕: the day and its lifts go, later days close the gap and are renamed. */
export function removePlanDay(dayId: string) {
  const db = getDb();
  const row = db.getFirstSync<{ plan_id: string; day_order: number }>(
    'SELECT plan_id, day_order FROM plan_days WHERE id = ?',
    [dayId],
  );
  if (!row) return;
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM plan_exercises WHERE plan_day_id = ?', [dayId]);
    db.runSync('DELETE FROM plan_days WHERE id = ?', [dayId]);
    db.runSync(
      'UPDATE plan_days SET day_order = day_order - 1 WHERE plan_id = ? AND day_order > ?',
      [row.plan_id, row.day_order],
    );
    renameDaysByOrder(row.plan_id);
    db.runSync(
      'UPDATE plans SET next_day_order = 0 WHERE id = ? AND next_day_order >= (SELECT count(*) FROM plan_days WHERE plan_id = ?)',
      [row.plan_id, row.plan_id],
    );
  });
}

/** Drag-reorder days; "Day N" follows the new order. */
export function reorderPlanDays(planId: string, orderedIds: string[]) {
  const db = getDb();
  db.withTransactionSync(() => {
    orderedIds.forEach((id, i) => {
      db.runSync('UPDATE plan_days SET day_order = ? WHERE id = ? AND plan_id = ?', [
        i,
        id,
        planId,
      ]);
    });
    renameDaysByOrder(planId);
  });
}

function renameDaysByOrder(planId: string) {
  const db = getDb();
  const days = db.getAllSync<{ id: string; day_order: number }>(
    'SELECT id, day_order FROM plan_days WHERE plan_id = ?',
    [planId],
  );
  for (const d of days) {
    db.runSync('UPDATE plan_days SET name = ? WHERE id = ?', [`Day ${d.day_order + 1}`, d.id]);
  }
}

/** A finished workout moves the plan to its next day (wrapping). */
export function advanceNextDay(dayId: string) {
  const db = getDb();
  const row = db.getFirstSync<{ plan_id: string; day_order: number; n: number }>(
    `SELECT d.plan_id, d.day_order, (SELECT count(*) FROM plan_days WHERE plan_id = d.plan_id) AS n
     FROM plan_days d WHERE d.id = ?`,
    [dayId],
  );
  if (!row || row.n === 0) return;
  db.runSync('UPDATE plans SET next_day_order = ? WHERE id = ?', [
    (row.day_order + 1) % row.n,
    row.plan_id,
  ]);
}
