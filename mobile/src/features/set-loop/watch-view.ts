import type { WatchAction } from '@modules/wolfset-hr';
import { DEFAULT_THRESHOLDS } from '@/features/hr/recovered';
import { isUntouched } from './machine';
import { restEndsAt } from './native-rest';
import type { PlanDayStart } from './plan-day';
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
      /** This lift has a skipped set to go back to — the panel's Undo Skip card. */
      canUnskip: boolean;
      /** The plan day the session is running (0-based order) — "Current" on Change It Up. */
      dayOrder: number;
      /** The workout is untouched and the plan has another day: the panel's Change
       *  Workout card, leading to Change It Up (164:4192). */
      canChange: boolean;
      /** Every day the plan could run, for Change It Up and the day preview (123:3251). */
      days: WatchDay[];
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

/** One plan day on the watch: its lifts as they would start (weights progressed). */
export type WatchDay = {
  order: number;
  name: string;
  lifts: { name: string; weight: number; sets: number; reps: number }[];
};

/** What the summary needs that the machine does not hold: the session clock and the
 *  heart-rate stream's average. */
export type SessionClock = { startedAt: number; now: number; avgBpm: number | null };

/** The plan's days as the session boot saw them (plan-day.ts); the day at `dayOrder`
 *  is the one running. */
export type SessionDays = { dayOrder: number; days: PlanDayStart[] };

export function watchView(state: SessionState, clock: SessionClock, plan: SessionDays): WatchView {
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
    canUnskip: state.setIndex > done - (phase.name === 'resting' ? 1 : 0),
    dayOrder: plan.dayOrder,
    canChange: isUntouched(state) && plan.days.length > 1,
    days: plan.days.map((d) => ({
      order: d.order,
      name: d.name,
      lifts: d.exercises.map((e) => ({
        name: e.name,
        weight: e.weight,
        sets: e.prescribedSets ?? 0,
        reps: e.targetReps,
      })),
    })),
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
export function watchActionToEvent(
  action: WatchAction,
  at: number,
  days: PlanDayStart[],
): SessionEvent | null {
  switch (action.type) {
    case 'logSet':
      return action.reps >= 1 ? { type: 'setLogged', reps: action.reps, at } : null;
    case 'continue':
      return { type: 'restEnded', reason: 'continue', at };
    case 'skipSet':
      return { type: 'setSkipped', at };
    case 'unskipSet':
      return { type: 'setUnskipped' };
    // Start Workout on the watch's day preview (123:3251): that day's lifts, from the top.
    case 'changeDay': {
      const day = days.find((d) => d.order === action.day);
      return day ? { type: 'dayChanged', exercises: day.exercises } : null;
    }
    // The watch already asked "End Workout?" (164:4371) — that is the double confirm.
    case 'endWorkout':
      return { type: 'workoutEnded', at };
    default:
      return null;
  }
}
