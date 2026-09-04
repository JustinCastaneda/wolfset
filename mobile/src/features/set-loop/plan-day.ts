import type { StoredProgress } from '@/lib/db/progress-store';
import type { SessionExercise } from './types';

// A plan day as a session would start it. The plan holds the starting prescription; the
// stored progress holds where each lift is now (data-model §5.2: yesterday's hits moved
// today's weights), so a day is only startable once the two are combined. Pure — tested.

/** One day the active plan could run: the session's boot, and the watch's Change It Up
 *  list and day preview (164:4192, 123:3251). */
export type PlanDayStart = {
  dayId: string;
  /** The plan's day order, 0-based — what the watch sends back to pick it. */
  order: number;
  name: string;
  exercises: SessionExercise[];
};

/** The plan's prescription with the stored progress applied: the current weight, and for
 *  by-feel and reps-first lifts the moving rep target. Steady lifts keep the plan's reps. */
export function applyProgress(
  exercises: SessionExercise[],
  progress: Record<string, StoredProgress>,
): SessionExercise[] {
  return exercises.map((ex) => ({
    ...ex,
    weight: progress[ex.exerciseId]?.currentWeight ?? ex.weight,
    targetReps:
      ex.strategy === 'by-feel' || ex.strategy === 'reps-first'
        ? (progress[ex.exerciseId]?.currentReps ?? ex.targetReps)
        : ex.targetReps,
  }));
}
