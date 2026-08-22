import { deloadWeight, roundToLoadable } from './rounding';
import type { ExerciseProgress, Outcome, Prescription, ProgressResult } from './types';

/**
 * Move an exercise's live numbers forward after a scored workout (data-model §5.2).
 * Pure: returns a new progress object, never mutates.
 *
 * | strategy   | hit                                              | failed          |
 * |------------|--------------------------------------------------|-----------------|
 * | steady     | weight += increment; failures = 0                | failures += 1   |
 * | reps-first | reps += repStep; past ceiling → weight up, reps reset; failures = 0 | failures += 1 |
 * | by-feel    | nothing automatic                                | nothing automatic |
 *
 * A `skipped` exercise leaves everything untouched — not doing an exercise is a miss,
 * not a failure (data-model §1).
 *
 * When the failure streak reaches `deload.afterFailures`, the result carries
 * `prompt: 'plateau'`. The rules stop there: the app asks the user whether to deload
 * (`applyDeload`) or end the mesocycle. It never decides for them (decision 11b).
 */
export function applyOutcome(
  progress: ExerciseProgress,
  outcome: Outcome,
  rx: Prescription,
): ProgressResult {
  if (outcome === 'skipped') return { progress, prompt: null };

  const base: ExerciseProgress = { ...progress, lastOutcome: outcome };
  const { strategy } = rx.progression;

  if (strategy === 'by-feel') return { progress: base, prompt: null };

  if (outcome === 'failed') {
    const consecutiveFailures = progress.consecutiveFailures + 1;
    const next = { ...base, consecutiveFailures };
    const prompt = consecutiveFailures >= rx.deload.afterFailures ? 'plateau' : null;
    return { progress: next, prompt };
  }

  // hit
  if (strategy === 'steady') {
    return {
      progress: {
        ...base,
        currentWeight: roundToLoadable(progress.currentWeight + rx.increment, rx.smallestStep),
        consecutiveFailures: 0,
      },
      prompt: null,
    };
  }

  // reps-first
  const nextReps = progress.currentReps + rx.progression.repStep;
  if (nextReps > rx.repCeiling) {
    return {
      progress: {
        ...base,
        currentWeight: roundToLoadable(progress.currentWeight + rx.increment, rx.smallestStep),
        currentReps: rx.reps,
        consecutiveFailures: 0,
      },
      prompt: null,
    };
  }
  return {
    progress: { ...base, currentReps: nextReps, consecutiveFailures: 0 },
    prompt: null,
  };
}

/**
 * The user chose "deload" at the plateau prompt: drop the weight by the exercise's
 * deload percent, land on a loadable weight, and clear the failure streak.
 */
export function applyDeload(progress: ExerciseProgress, rx: Prescription): ExerciseProgress {
  return {
    ...progress,
    currentWeight: deloadWeight(progress.currentWeight, rx.deload.percent, rx.smallestStep),
    consecutiveFailures: 0,
  };
}
