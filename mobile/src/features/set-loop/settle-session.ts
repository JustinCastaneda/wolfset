import { applyDeload, applyOutcome } from '@/features/progression/progress';
import { scoreExercise } from '@/features/progression/scoring';
import type { ExerciseProgress, Prescription } from '@/features/progression/types';
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
  /** The plateau question, when the streak hits the threshold. The app asks. */
  plateau: null | { deloadTo: number };
  progress: StoredProgress;
};

export function settleSession(
  state: SessionState,
  prior: Record<string, StoredProgress>,
): SettledExercise[] {
  return state.exercises.map((ex, i) => {
    const rx: Prescription = { ...DEFAULT_RX, sets: ex.prescribedSets ?? 0, reps: ex.targetReps };
    const logged = state.sets.filter((s) => s.exerciseIndex === i).map((s) => ({ reps: s.reps }));
    const outcome = ex.prescribedSets === null ? 'hit' : scoreExercise(rx, logged);
    const before: ExerciseProgress = {
      // The session's weight (Edit Weights may have moved it) is the truth to progress from.
      currentWeight: ex.weight,
      currentReps: ex.targetReps,
      consecutiveFailures: prior[ex.exerciseId]?.consecutiveFailures ?? 0,
      lastOutcome: prior[ex.exerciseId]?.lastOutcome ?? null,
    };
    const { progress, prompt } = applyOutcome(before, outcome, rx);
    const lastOutcome: StoredProgress['lastOutcome'] =
      outcome === 'skipped' ? (prior[ex.exerciseId]?.lastOutcome ?? null) : outcome;
    return {
      exerciseId: ex.exerciseId,
      name: ex.name,
      outcome,
      prevWeight: ex.weight,
      nextWeight: progress.currentWeight,
      plateau: prompt === 'plateau' ? { deloadTo: applyDeload(progress, rx).currentWeight } : null,
      progress: {
        currentWeight: progress.currentWeight,
        consecutiveFailures: progress.consecutiveFailures,
        lastOutcome,
      },
    };
  });
}

/** The user chose "deload" at a plateau prompt: the stored numbers after accepting. */
export function acceptDeload(settled: SettledExercise): StoredProgress {
  if (!settled.plateau) return settled.progress;
  return { currentWeight: settled.plateau.deloadTo, consecutiveFailures: 0, lastOutcome: null };
}
