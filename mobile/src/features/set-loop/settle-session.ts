import { applyByFeel } from '@/features/progression/by-feel';
import { applyDeload, applyOutcome } from '@/features/progression/progress';
import { scoreExercise } from '@/features/progression/scoring';
import type { ByFeelHistory, ExerciseProgress, Prescription } from '@/features/progression/types';
import type { StoredProgress } from '@/lib/db/progress-store';
import type { SessionState } from './types';

// Settling a finished session (data-model §5.1–5.2): score each lift, run the tested
// progression rules, and produce what Session Done shows and what gets stored. Pure —
// the caller persists. Until the plan builder exists, every demo-day lift runs the
// plan defaults: steady, +5 lb, deload 10% after 2 failures, 5 lb steps.

const DEFAULT_RX: Omit<Prescription, 'sets' | 'reps'> = {
  increment: 5,
  repCeiling: 20,
  progression: { strategy: 'steady' },
  deload: { percent: 10, afterFailures: 2 },
  smallestStep: 5,
};

export type SettledExercise = {
  exerciseId: string;
  name: string;
  outcome: 'hit' | 'failed' | 'skipped';
  prevWeight: number;
  nextWeight: number;
  /** By-feel lifts: the moving rep target, before and after. */
  prevReps: number;
  nextReps: number;
  /** The plateau/deload question, when raised. The app asks (11b; by-feel asks too). */
  plateau: null | { deloadTo: number };
  /** By-feel engine: grid unrated two sessions running — suggest switching to Steady. */
  offerSteady: boolean;
  progress: StoredProgress;
};

export function settleSession(
  state: SessionState,
  prior: Record<string, StoredProgress>,
): SettledExercise[] {
  return state.exercises.map((ex, i) => {
    const byFeel = ex.strategy === 'by-feel';
    const rx: Prescription = byFeel
      ? {
          ...DEFAULT_RX,
          sets: ex.prescribedSets ?? 0,
          reps: ex.targetReps,
          progression: {
            strategy: 'by-feel',
            repRangeMin: ex.targetReps,
            repRangeMax: ex.targetReps + 3,
          },
        }
      : { ...DEFAULT_RX, sets: ex.prescribedSets ?? 0, reps: ex.targetReps };
    const logged = state.sets.filter((s) => s.exerciseIndex === i).map((s) => ({ reps: s.reps }));
    const outcome = ex.prescribedSets === null ? 'hit' : scoreExercise(rx, logged);
    const stored = prior[ex.exerciseId];
    const before: ExerciseProgress = {
      // The session's weight (Edit Weights may have moved it) is the truth to progress from.
      currentWeight: ex.weight,
      currentReps: ex.targetReps,
      consecutiveFailures: stored?.consecutiveFailures ?? 0,
      lastOutcome: stored?.lastOutcome ?? null,
    };

    let progress: ExerciseProgress = before;
    let plateau: SettledExercise['plateau'] = null;
    let offerSteady = false;
    const rating = state.feelRatings[i] ?? null;

    if (outcome !== 'skipped' && byFeel && rx.progression.strategy === 'by-feel') {
      const previous: ByFeelHistory | null = stored
        ? {
            outcome: stored.lastOutcome ?? 'hit',
            rating:
              stored.lastReserve && stored.lastForm
                ? { reserve: stored.lastReserve, form: stored.lastForm }
                : null,
            heldAtTop: stored.heldAtTop,
          }
        : null;
      const result = applyByFeel(
        before,
        { outcome: outcome === 'hit' ? 'hit' : 'failed', rating },
        previous,
        rx,
      );
      progress = result.progress;
      if (result.prompt === 'deload')
        plateau = { deloadTo: applyDeload(progress, rx).currentWeight };
      if (result.prompt === 'offer-steady') offerSteady = true;
    } else if (outcome !== 'skipped') {
      const result = applyOutcome(before, outcome, rx);
      progress = result.progress;
      if (result.prompt === 'plateau')
        plateau = { deloadTo: applyDeload(progress, rx).currentWeight };
    }

    const lastOutcome: StoredProgress['lastOutcome'] =
      outcome === 'skipped' ? (stored?.lastOutcome ?? null) : outcome;
    // Held at the top of the range: the engine's two-session escape hatch reads this.
    const atTop = byFeel && before.currentReps >= ex.targetReps + 3;
    const held =
      byFeel &&
      outcome === 'hit' &&
      atTop &&
      progress.currentWeight === before.currentWeight &&
      progress.currentReps === before.currentReps;
    return {
      exerciseId: ex.exerciseId,
      name: ex.name,
      outcome,
      prevWeight: ex.weight,
      nextWeight: progress.currentWeight,
      prevReps: before.currentReps,
      nextReps: progress.currentReps,
      plateau,
      offerSteady,
      progress: {
        currentWeight: progress.currentWeight,
        consecutiveFailures: progress.consecutiveFailures,
        lastOutcome,
        currentReps: byFeel ? progress.currentReps : null,
        lastReserve:
          byFeel && outcome !== 'skipped'
            ? (rating?.reserve ?? null)
            : (stored?.lastReserve ?? null),
        lastForm:
          byFeel && outcome !== 'skipped' ? (rating?.form ?? null) : (stored?.lastForm ?? null),
        heldAtTop: byFeel ? held : false,
      },
    };
  });
}

/** The user chose "deload" at a plateau prompt: the stored numbers after accepting. */
export function acceptDeload(settled: SettledExercise): StoredProgress {
  if (!settled.plateau) return settled.progress;
  return {
    ...settled.progress,
    currentWeight: settled.plateau.deloadTo,
    consecutiveFailures: 0,
    lastOutcome: null,
  };
}
