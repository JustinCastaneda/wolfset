import type { SessionEvent, SessionState } from './types';

// Small pure helpers the loop screens share. UI math only — the rules live in machine.ts.

export type Dispatch = (event: SessionEvent) => void;

export function currentExercise(state: SessionState) {
  return state.exercises[state.exerciseIndex];
}

/** "Workout A • Squat • 2/5" — the Top Bar eyebrow on every loop screen. */
export function loopTitle(dayName: string, state: SessionState): string {
  const ex = currentExercise(state);
  const current = state.setIndex + 1;
  if (ex.prescribedSets === null) return `${dayName} • ${ex.name} • Set ${current}`;
  return `${dayName} • ${ex.name} • ${Math.min(current, ex.prescribedSets)}/${ex.prescribedSets}`;
}

/** Whole-day sets bar: done = every logged set, total = every prescribed set. */
export function dayProgress(state: SessionState): { done: number; total: number } {
  const total = state.exercises.reduce((sum, ex) => sum + (ex.prescribedSets ?? 0), 0);
  return { done: Math.min(state.sets.length, total), total };
}

/** "1:23" from seconds, zero-padded, floor — what the ring's numeral shows. */
export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** The day's planned volume — the overview subtitle's forecast (frame 384:11487). */
export function plannedVolume(state: SessionState): number {
  return state.exercises.reduce(
    (sum, ex) => sum + (ex.prescribedSets ?? 0) * ex.targetReps * ex.weight,
    0,
  );
}

/** Session totals for the done screen: Σ weight×reps and set count. */
export function sessionTotals(state: SessionState): { volume: number; sets: number } {
  return {
    volume: state.sets.reduce((sum, s) => sum + s.weight * s.reps, 0),
    sets: state.sets.length,
  };
}
