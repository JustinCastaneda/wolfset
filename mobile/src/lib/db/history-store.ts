import { getDb } from './database';

// Reads finished workouts (data-model §2 Workout / WorkoutSet). Add Exercise Details
// shows the last time a lift was done: "Last Workout 80 x 5 for 5 sets".

export type LastWorkout = { weight: number; reps: number; sets: number };

export function lastWorkoutFor(exerciseId: string): LastWorkout | null {
  const db = getDb();
  const last = db.getFirstSync<{ workout_id: string }>(
    `SELECT s.workout_id FROM workout_sets s JOIN workouts w ON w.id = s.workout_id
     WHERE s.exercise_id = ? ORDER BY w.ended_at DESC LIMIT 1`,
    [exerciseId],
  );
  if (!last) return null;
  const rows = db.getAllSync<{ weight: number; reps: number }>(
    'SELECT weight, reps FROM workout_sets WHERE workout_id = ? AND exercise_id = ? ORDER BY set_index ASC',
    [last.workout_id, exerciseId],
  );
  if (rows.length === 0) return null;
  // The prescription that session was the first set's weight; reps = the lowest set,
  // so a missed last set reads as a miss.
  return {
    weight: rows[0].weight,
    reps: Math.min(...rows.map((r) => r.reps)),
    sets: rows.length,
  };
}
