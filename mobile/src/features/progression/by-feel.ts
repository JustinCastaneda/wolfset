import { deloadWeight, roundToLoadable } from './rounding';
import type {
  ByFeelHistory,
  ByFeelSession,
  ExerciseProgress,
  Prescription,
  ProgressResult,
} from './types';

/**
 * The By Feel Calculation Engine — Figma section 384:11049, data-model §5.6.
 * Runs when a By Feel exercise finishes. Pure; never mutates.
 *
 * Step 1 — the poke picks the steps:
 *   all reps · plenty left (3 / 4+) · clean  → 2 steps
 *   all reps · 1–2 left · clean             → 1 step
 *   anything else (nothing left, form broke, missed reps, not rated) → hold
 *
 * Step 2 — the rep range picks the lever:
 *   below the top of the range → +1 rep per step, capped at the top
 *   at the top of the range    → +weight, reps reset to the bottom
 *
 * From past sessions (only ever the previous one):
 *   form broke while grinding (reserve ≤ 2), or missed reps two sessions running
 *     → deload 10% — the engine's own rule, applied here, not prompted (unlike the
 *       plateau prompt in steady/reps-first, the spec states this as the action)
 *   form broke at plenty left → just hold (the weight isn't the problem)
 *   held at the top of the range two sessions running → add weight anyway
 *   grid unrated two sessions running → hold and ask about switching to Steady
 */
export function applyByFeel(
  progress: ExerciseProgress,
  session: ByFeelSession,
  previous: ByFeelHistory | null,
  rx: Prescription,
): ProgressResult {
  if (rx.progression.strategy !== 'by-feel') {
    throw new Error(`applyByFeel called with strategy '${rx.progression.strategy}'`);
  }
  const { repRangeMin, repRangeMax } = rx.progression;
  const base: ExerciseProgress = { ...progress, lastOutcome: session.outcome };
  const hold = (prompt: ProgressResult['prompt'] = null): ProgressResult => ({
    progress: base,
    prompt,
  });

  const plentyLeft = session.rating?.reserve === '3' || session.rating?.reserve === '4plus';

  // Form broke: at plenty left the weight isn't the problem — hold. While grinding, it is — deload.
  if (session.rating?.form === 'bad') {
    if (plentyLeft) return hold();
    return {
      progress: {
        ...base,
        currentWeight: deloadWeight(progress.currentWeight, rx.deload.percent, rx.smallestStep),
      },
      prompt: null,
    };
  }

  // Missed reps two sessions running → deload.
  if (session.outcome === 'failed') {
    if (previous?.outcome === 'failed') {
      return {
        progress: {
          ...base,
          currentWeight: deloadWeight(progress.currentWeight, rx.deload.percent, rx.smallestStep),
        },
        prompt: null,
      };
    }
    return hold();
  }

  // All reps hit and form clean (or unrated) from here on.
  const steps = !session.rating ? 0 : plentyLeft ? 2 : session.rating.reserve === '0' ? 0 : 1;

  const atTop = progress.currentReps >= repRangeMax;
  const addWeight = (): ProgressResult => ({
    progress: {
      ...base,
      currentWeight: roundToLoadable(progress.currentWeight + rx.increment, rx.smallestStep),
      currentReps: repRangeMin,
    },
    prompt: null,
  });

  if (steps > 0) {
    if (atTop) return addWeight();
    return {
      progress: { ...base, currentReps: Math.min(progress.currentReps + steps, repRangeMax) },
      prompt: null,
    };
  }

  // Hold verdict. Two escape hatches from stalling forever:
  if (atTop && previous?.heldAtTop) return addWeight();
  if (!session.rating && previous && !previous.rating) return hold('offer-steady');
  return hold();
}
