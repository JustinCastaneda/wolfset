import type { SessionEvent, SessionExercise, SessionState } from './types';

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

/** Whole-day progress: done = every logged set, total = every prescribed set.
 *  Drives the overview's fill bar. */
export function dayProgress(state: SessionState): { done: number; total: number } {
  const total = state.exercises.reduce((sum, ex) => sum + (ex.prescribedSets ?? 0), 0);
  return { done: Math.min(state.sets.length, total), total };
}

/** The loop screens' segment bar shows *this exercise's* sets, not the day's
 *  (Justin, round 4). done = sets logged for the current exercise. */
export function exerciseProgress(state: SessionState): { done: number; total: number } {
  const ex = currentExercise(state);
  const done = state.sets.filter((s) => s.exerciseIndex === state.exerciseIndex).length;
  return { done, total: ex.prescribedSets ?? Math.max(done + 1, 1) };
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

/** A rough length for a day before it starts — the "~55m" on the Day Overview (34:778):
 *  every prescribed set costs its rest plus about 45 s of lifting. Deliberately crude
 *  (Justin, 2026-09-04: "ish" it for now; learning the user's real pace is a later idea). */
export function estimatedMinutes(exercises: SessionExercise[]): number {
  const seconds = exercises.reduce(
    (sum, ex) => sum + (ex.prescribedSets ?? 0) * (ex.restSeconds + WORKING_SECONDS_PER_SET),
    0,
  );
  return Math.round(seconds / 60);
}

const WORKING_SECONDS_PER_SET = 45;

/** Session totals for the done screen: Σ weight×reps and set count. */
export function sessionTotals(state: SessionState): { volume: number; sets: number } {
  return {
    volume: state.sets.reduce((sum, s) => sum + s.weight * s.reps, 0),
    sets: state.sets.length,
  };
}
