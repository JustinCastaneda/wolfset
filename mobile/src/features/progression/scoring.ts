import type { LoggedSet, Outcome } from './types';

/**
 * Score one exercise when a workout finishes (data-model §5.1).
 *
 * - `skipped`: nothing was logged.
 * - `hit`: every prescribed set was logged with reps ≥ target.
 * - `failed`: anything else — too few sets, or any set under target.
 *
 * A workout ended early is scored the same way, so unfinished exercises are failures
 * (Justin, 2026-08-22). Freestyle exercises have no prescription and are never scored —
 * don't call this for them.
 */
export function scoreExercise(
  prescribed: { sets: number; reps: number },
  logged: readonly LoggedSet[],
): Outcome {
  if (logged.length === 0) return 'skipped';
  if (logged.length < prescribed.sets) return 'failed';
  // Only the first `sets` count; extra sets are a bonus, not a penalty.
  const counted = logged.slice(0, prescribed.sets);
  return counted.every((set) => set.reps >= prescribed.reps) ? 'hit' : 'failed';
}
