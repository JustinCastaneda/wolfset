import type { WatchAction } from '@modules/wolfset-hr';
import { DEFAULT_THRESHOLDS } from '@/features/hr/recovered';
import { restEndsAt } from './native-rest';
import { currentExercise, exerciseProgress } from './session-ui';
import type { SessionEvent, SessionState } from './types';

// The watch mirrors the loop (Figma 123:3945): the phone's session is the truth, the
// watch draws a small view of it — which set to log, which rest is running — and sends
// taps back. Both directions are pure here; the wire is watch-control.ts.

/** What the watch shows. `none` clears it (session over, screen left, poke grid up). */
export type WatchView =
  | { screen: 'none' }
  | {
      screen: 'set' | 'rest';
      /** 1-based position in the workout — "01 • Squat". */
      exerciseNo: number;
      exercise: string;
      setsDone: number;
      setsTotal: number;
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

const NONE: WatchView = { screen: 'none' };

export function watchView(state: SessionState): WatchView {
  const phase = state.phase;
  if (phase.name === 'done') return NONE;
  const ex = currentExercise(state);
  const { done, total } = exerciseProgress(state);
  return {
    // Editing the weight on the phone leaves the watch on the set; its Log would be
    // ignored by the machine until the edit closes, which is the phone's rule too.
    screen: phase.name === 'resting' ? 'rest' : 'set',
    exerciseNo: state.exerciseIndex + 1,
    exercise: ex.name,
    setsDone: done,
    setsTotal: total,
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
    default:
      return null;
  }
}
