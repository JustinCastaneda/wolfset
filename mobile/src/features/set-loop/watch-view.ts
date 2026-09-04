import type { WatchAction } from '@modules/wolfset-hr';
import { DEFAULT_THRESHOLDS } from '@/features/hr/recovered';
import { restEndsAt } from './native-rest';
import { currentExercise, dayProgress, exerciseProgress, sessionTotals } from './session-ui';
import type { SessionEvent, SessionState } from './types';

// The watch mirrors the loop (Figma 123:3945): the phone's session is the truth, the
// watch draws a small view of it — which set to log, which rest is running, the summary
// when it is over — and sends taps back. Both directions are pure here; the wire is
// watch-control.ts.

/** What the watch shows. `none` clears it (screen left, poke grid up). */
export type WatchView =
  | { screen: 'none' }
  /** Session Done (164:4712), until Finish — on either surface — leaves. */
  | {
      screen: 'done';
      durationSeconds: number;
      /** Σ weight × reps, the phone's Total Weight. */
      volume: number;
      /** Session average heart rate; null when the watch never streamed. */
      avgBpm: number | null;
      /** Lifts with at least one set logged. */
      exercisesDone: number;
    }
  | {
      screen: 'set' | 'rest';
      /** 1-based position in the workout — "01 • Squat". */
      exerciseNo: number;
      exercise: string;
      setsDone: number;
      setsTotal: number;
      /** 1-based index of the set to log — the current pip. Past `setsDone` after a
       *  skip, which is also what makes a skip visible to the watch. */
      setNo: number;
      /** The day's sets, for End Workout's "Only 3 of 5 sets done." (164:4371). */
      dayDone: number;
      dayTotal: number;
      weight: number;
      unit: 'Lbs';
      /** Target reps for the next set; the watch counts down from it like Log a Set. */
      reps: number;
      /** Wall-clock ms when the rest ends; 0 outside a rest. */
      restEndsAt: number;
      restSeconds: number;
      /** The gate's verdict for this rest: arms Continue on the watch, never presses it. */
      recovered: boolean;
      recoveredBelowBpm: number;
      approachingUpToBpm: number;
    };

/** What the summary needs that the machine does not hold: the session clock and the
 *  heart-rate stream's average. */
export type SessionClock = { startedAt: number; now: number; avgBpm: number | null };

export function watchView(state: SessionState, clock: SessionClock): WatchView {
  const phase = state.phase;
  if (phase.name === 'done') {
    const logged = new Set(state.sets.map((s) => s.exerciseIndex));
    return {
      screen: 'done',
      durationSeconds: Math.max(0, Math.floor((clock.now - clock.startedAt) / 1000)),
      volume: sessionTotals(state).volume,
      avgBpm: clock.avgBpm === null ? null : Math.round(clock.avgBpm),
      exercisesDone: logged.size,
    };
  }
  const ex = currentExercise(state);
  const { done, total } = exerciseProgress(state);
  const day = dayProgress(state);
  return {
    // Editing the weight on the phone leaves the watch on the set; its Log would be
    // ignored by the machine until the edit closes, which is the phone's rule too.
    screen: phase.name === 'resting' ? 'rest' : 'set',
    exerciseNo: state.exerciseIndex + 1,
    exercise: ex.name,
    setsDone: done,
    setsTotal: total,
    setNo: state.setIndex + 1,
    dayDone: day.done,
    dayTotal: day.total,
    weight: ex.weight,
    unit: 'Lbs',
    reps: ex.targetReps,
    restEndsAt: restEndsAt(phase) ?? 0,
    restSeconds: phase.name === 'resting' ? phase.restSeconds : 0,
    recovered: phase.name === 'resting' && phase.recovered,
    recoveredBelowBpm: DEFAULT_THRESHOLDS.recoveredBelowBpm,
    approachingUpToBpm: DEFAULT_THRESHOLDS.approachingUpToBpm,
  };
}

/** A watch tap as the machine event the phone's own button would send; null for
 *  anything unknown. The machine's guards make a late or repeated tap a no-op. */
export function watchActionToEvent(action: WatchAction, at: number): SessionEvent | null {
  switch (action.type) {
    case 'logSet':
      return action.reps >= 1 ? { type: 'setLogged', reps: action.reps, at } : null;
    case 'continue':
      return { type: 'restEnded', reason: 'continue', at };
    case 'skipSet':
      return { type: 'setSkipped', at };
    // The watch already asked "End Workout?" (164:4371) — that is the double confirm.
    case 'endWorkout':
      return { type: 'workoutEnded', at };
    default:
      return null;
  }
}
