import { getDb } from './database';
import type { SessionExercise } from '@/features/set-loop/types';

// Reads the plan tables (data-model §2: Plan → PlanDay → PlanExercise). The session
// boots from here; the plan builder writes here. Until mesocycles track which day is
// next, the active plan's first day is the day.

export type ActiveDay = {
  planName: string;
  dayId: string;
  dayName: string;
  exercises: SessionExercise[];
};

/** One plan_exercises row joined to its day — the shape the mapper below reads. */
export type PlanExerciseRow = {
  exercise_id: string;
  name: string;
  sets: number;
  reps: number;
  start_weight: number;
  rest_seconds: number;
  auto_start_timer: number;
  strategy: string | null;
};

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
    `SELECT exercise_id, name, sets, reps, start_weight, rest_seconds, auto_start_timer, strategy
     FROM plan_exercises WHERE plan_day_id = ? ORDER BY exercise_order ASC`,
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
 *  `strategy` null means "inherit the plan default", which is steady until the plan
 *  builder stores a per-plan default. */
export function sessionExercisesFrom(rows: PlanExerciseRow[]): SessionExercise[] {
  return rows.map((r) => ({
    exerciseId: r.exercise_id,
    name: r.name,
    prescribedSets: r.sets,
    targetReps: r.reps,
    weight: r.start_weight,
    restSeconds: r.rest_seconds,
    autoStartTimer: r.auto_start_timer === 1,
    ...(r.strategy === 'by-feel' ? { strategy: 'by-feel' as const } : {}),
  }));
}
