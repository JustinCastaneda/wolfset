import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { WolfsetHr } from '@modules/wolfset-hr';

import { loadActivePlan, setNextDay, advanceNextDay } from '@/lib/db/plan-store';
import { loadSnapshot, saveSnapshot } from '@/lib/db/session-store';
import { installWatchStart, session } from './session-controller';
import type { SessionExercise } from './types';

// The controller against a fake native module and fake stores: what a workout does to
// the watch, the foreground service, the rest timer and the snapshot, without a screen.

jest.mock('@modules/wolfset-hr', () => {
  const listeners: Record<string, ((payload: unknown) => void)[]> = {};
  return {
    WolfsetHr: {
      addListener: jest.fn((name: string, handler: (payload: unknown) => void) => {
        (listeners[name] ??= []).push(handler);
        return {
          remove: () => {
            listeners[name] = listeners[name].filter((h) => h !== handler);
          },
        };
      }),
      emit: (name: string, payload: unknown) => (listeners[name] ?? []).forEach((h) => h(payload)),
      listenerCount: (name: string) => (listeners[name] ?? []).length,
      startWatchStream: jest.fn(async () => 1),
      stopWatchStream: jest.fn(async () => 1),
      publishWatchView: jest.fn(),
      startWorkout: jest.fn(),
      endWorkout: jest.fn(),
      askStillLifting: jest.fn(),
      dismissStillLifting: jest.fn(),
      hasRestPermissions: jest.fn(() => true),
      requestRestPermissions: jest.fn(async () => true),
      startRest: jest.fn(),
      endRest: jest.fn(),
    },
  };
});
jest.mock('@/lib/db/plan-store', () => ({
  loadActivePlan: jest.fn(),
  setNextDay: jest.fn(),
  advanceNextDay: jest.fn(),
}));
jest.mock('@/lib/db/progress-store', () => ({
  loadAllProgress: jest.fn(() => ({})),
  saveProgress: jest.fn(),
}));
jest.mock('@/lib/db/session-store', () => ({
  loadSnapshot: jest.fn(() => null),
  saveSnapshot: jest.fn(),
  finalizeSession: jest.fn(),
}));

type Fn = jest.Mock<(...args: never[]) => unknown>;
const native = WolfsetHr as unknown as Record<string, Fn> & {
  emit: (name: string, payload: unknown) => void;
  listenerCount: (name: string) => number;
};
const plan = loadActivePlan as unknown as Fn;
const snapshot = loadSnapshot as unknown as Fn;

const squat: SessionExercise = {
  exerciseId: 'squat',
  name: 'Squat',
  prescribedSets: 2,
  targetReps: 5,
  weight: 100,
  restSeconds: 90,
  autoStartTimer: true,
};
const day = (dayId: string, order: number, isNext: boolean, exercises = [squat]) => ({
  dayId,
  order,
  name: `Workout ${dayId}`,
  isNext,
  exercises,
});

function lastView(): { screen: string } & Record<string, unknown> {
  const calls = native.publishWatchView.mock.calls;
  return JSON.parse(calls[calls.length - 1][0] as string);
}

beforeEach(() => {
  // One clock for the controller and the tests: the forgotten-workout rule compares
  // the session's timestamps with Date.now(), so both come from the fake timers.
  jest.useFakeTimers({ now: 1_000 });
  // Close whatever the previous test left live, then start counting.
  session.abandon(0);
  jest.clearAllMocks();
  plan.mockReturnValue({
    planId: 'p',
    planName: 'Plan A',
    days: [day('A', 0, true), day('B', 1, false)],
  });
  snapshot.mockReturnValue(null);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('starting the live session', () => {
  it('runs nothing without a plan day, and holds nothing native', () => {
    plan.mockReturnValue(null);
    expect(session.start(1_000)).toBe(false);
    expect(session.get()).toBeNull();
    expect(native.startWorkout).not.toHaveBeenCalled();
    expect(native.startWatchStream).not.toHaveBeenCalled();
  });

  it('holds the workout service under the day, streams the watch, shows the set, snapshots', () => {
    expect(session.start(1_000)).toBe(true);
    expect(native.startWorkout).toHaveBeenCalledWith('Workout A');
    expect(native.startWatchStream).toHaveBeenCalledTimes(1);
    expect(lastView()).toMatchObject({ screen: 'set', exercise: 'Squat', dayOrder: 0 });
    expect(saveSnapshot).toHaveBeenCalledTimes(1);
    expect(session.get()?.startedAt).toBe(1_000);
  });

  it('is idempotent: a second start from any surface changes nothing', () => {
    session.start(1_000);
    expect(session.start(2_000)).toBe(true);
    expect(native.startWorkout).toHaveBeenCalledTimes(1);
    expect(session.get()?.startedAt).toBe(1_000);
  });

  it('resumes the workout under way from its snapshot, clock included', () => {
    session.start(1_000);
    session.dispatch({ type: 'setLogged', reps: 5, at: 1_500 });
    const saved = session.get()!;
    session.abandon(2_000);
    jest.clearAllMocks();
    snapshot.mockReturnValue({ state: saved.state, startedAt: 1_000 });
    session.start(9_000);
    expect(session.get()?.startedAt).toBe(1_000);
    expect(session.get()?.state.sets).toHaveLength(1);
    expect(lastView().screen).toBe('rest');
  });

  it('Next Workout on the watch starts it without any screen', () => {
    const off = installWatchStart();
    native.emit('onWatchAction', { type: 'startWorkout', reps: 0, day: -1 });
    expect(session.get()).not.toBeNull();
    expect(lastView().screen).toBe('set');
    off();
  });
});

describe('the watch driving the session', () => {
  it('a Log on the wrist starts the rest: native timer armed, rest view published', () => {
    session.start(1_000);
    native.emit('onWatchAction', { type: 'logSet', reps: 5, day: -1 });
    expect(session.get()?.state.phase.name).toBe('resting');
    expect(native.startRest).toHaveBeenCalledTimes(1);
    expect(lastView()).toMatchObject({ screen: 'rest', restSeconds: 90 });
  });

  it('the native "rest over" ends only the rest it belongs to', () => {
    session.start(1_000);
    session.dispatch({ type: 'setLogged', reps: 5, at: 1_000 });
    const endsAt = native.startRest.mock.calls[0][0] as number;
    native.emit('onRestEnded', { at: endsAt + 5, endsAt: endsAt - 1 });
    expect(session.get()?.state.phase.name).toBe('resting');
    native.emit('onRestEnded', { at: endsAt + 5, endsAt });
    expect(session.get()?.state.phase.name).toBe('logging');
    expect(session.get()?.state.sets[0].restEndedAt).toBe(endsAt + 5);
  });

  it('a fresh heart rate under the threshold arms Continue; the rest never ends by itself', () => {
    session.start(1_000);
    session.dispatch({ type: 'setLogged', reps: 5, at: Date.now() });
    let seq = 0;
    const sample = (bpm: number) => ({
      seq: ++seq,
      bpm,
      acc: 'ACCURACY_HIGH',
      watchWallMs: Date.now(),
      phoneRecvMs: Date.now(),
      amb: 0,
      bm: 1,
    });
    native.emit('onHrSample', sample(150));
    expect(lastView().recovered).toBe(false);
    native.emit('onHrSample', sample(110));
    expect(lastView().recovered).toBe(true);
    expect(session.get()?.state.phase.name).toBe('resting');
    expect(session.get()?.avgBpm).toBe(130);
  });

  it('Change Workout swaps the day and points the rotation at it while untouched', () => {
    session.start(1_000);
    native.emit('onWatchAction', { type: 'changeDay', reps: 0, day: 1 });
    expect(session.get()?.day.dayId).toBe('B');
    expect(setNextDay).toHaveBeenCalledWith('B');
    expect(lastView()).toMatchObject({ screen: 'set', dayOrder: 1 });
  });

  it('End on the watch settles the session: stored, rotated, watch stream stopped', () => {
    session.start(1_000);
    native.emit('onWatchAction', { type: 'endWorkout', reps: 0, day: -1 });
    expect(session.get()?.summary).not.toBeNull();
    expect(advanceNextDay).toHaveBeenCalledWith('A');
    expect(native.stopWatchStream).toHaveBeenCalled();
    expect(lastView().screen).toBe('done');
    // Still live — Session Done is being read — and the service still held.
    expect(native.endWorkout).not.toHaveBeenCalled();
  });

  it('Finish closes it: watch cleared, service released, listeners gone', async () => {
    session.start(1_000);
    const closed = session.closed();
    native.emit('onWatchAction', { type: 'endWorkout', reps: 0, day: -1 });
    native.emit('onWatchAction', { type: 'finish', reps: 0, day: -1 });
    await closed;
    expect(session.get()).toBeNull();
    expect(lastView().screen).toBe('none');
    expect(native.endWorkout).toHaveBeenCalledTimes(1);
    expect(native.listenerCount('onWatchAction')).toBe(0);
    expect(native.listenerCount('onRestEnded')).toBe(0);
  });

  it('Finish before the session is over does nothing', () => {
    session.start(1_000);
    native.emit('onWatchAction', { type: 'finish', reps: 0, day: -1 });
    expect(session.get()).not.toBeNull();
  });
});

describe('the forgotten-workout clock', () => {
  const MIN = 60_000;
  const finalize = jest.requireMock('@/lib/db/session-store') as { finalizeSession: Fn };

  it('asks "Still lifting?" on both surfaces after twenty idle minutes', () => {
    jest.setSystemTime(1_000_000);
    session.start(Date.now());
    session.dispatch({ type: 'setLogged', reps: 5, at: Date.now() });
    jest.advanceTimersByTime(19 * MIN);
    expect(native.askStillLifting).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1 * MIN + 1);
    expect(native.askStillLifting).toHaveBeenCalledTimes(1);
    expect(lastView()).toMatchObject({ screen: 'idle', idleEndsAt: 1_000_000 + 30 * MIN });
  });

  it('a rest running out on its own is not the lifter; Continue on the watch is', () => {
    jest.setSystemTime(1_000_000);
    session.start(Date.now());
    session.dispatch({ type: 'setLogged', reps: 5, at: Date.now() });
    jest.advanceTimersByTime(2 * MIN); // the 90 s rest ended by its timer
    expect(session.get()?.state.phase.name).toBe('logging');
    jest.advanceTimersByTime(18 * MIN + 1);
    expect(lastView().screen).toBe('idle');
    native.emit('onWatchAction', { type: 'stillLifting', reps: 0, day: -1 });
    expect(lastView().screen).toBe('set');
    expect(native.dismissStillLifting).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(19 * MIN);
    expect(native.askStillLifting).toHaveBeenCalledTimes(1);
  });

  it('unanswered, the workout ends at the last thing the lifter did and closes', () => {
    jest.setSystemTime(1_000_000);
    session.start(Date.now());
    session.dispatch({ type: 'setLogged', reps: 5, at: 1_000_000 + 5 * MIN });
    jest.advanceTimersByTime(35 * MIN + 1);
    expect(session.get()).toBeNull();
    const [, startedAt, endedAt] = finalize.finalizeSession.mock.calls[0] as unknown as number[];
    expect(startedAt).toBe(1_000_000);
    expect(endedAt).toBe(1_000_000 + 5 * MIN);
    expect(lastView().screen).toBe('none');
    expect(native.endWorkout).toHaveBeenCalledTimes(1);
  });

  it('three hours is the ceiling even for a lifter who keeps logging', () => {
    jest.setSystemTime(1_000_000);
    plan.mockReturnValue({
      planId: 'p',
      planName: 'Plan A',
      days: [day('A', 0, true, [{ ...squat, prescribedSets: 50 }])],
    });
    session.start(Date.now());
    for (let i = 0; i < 11; i += 1) {
      jest.advanceTimersByTime(15 * MIN);
      session.dispatch({ type: 'setLogged', reps: 5, at: Date.now() });
    }
    expect(session.get()).not.toBeNull();
    jest.advanceTimersByTime(15 * MIN + 1);
    expect(session.get()).toBeNull();
  });

  it('opening the session screen counts as showing up', () => {
    jest.setSystemTime(1_000_000);
    session.start(Date.now());
    jest.advanceTimersByTime(20 * MIN + 1);
    expect(lastView().screen).toBe('idle');
    void session.onScreenOpened();
    expect(lastView().screen).toBe('set');
  });
});

describe('a finished workout nobody tapped Finish on', () => {
  it('closes after thirty quiet minutes on Session Done, settled as it stands', () => {
    jest.setSystemTime(1_000_000);
    session.start(Date.now());
    session.dispatch({ type: 'setLogged', reps: 5, at: Date.now() });
    jest.advanceTimersByTime(2 * 60_000);
    session.dispatch({ type: 'setLogged', reps: 5, at: Date.now() });
    expect(session.get()?.state.phase).toEqual({ name: 'done', endedEarly: false });
    expect(session.get()?.summary?.[0].outcome).toBe('hit');
    jest.advanceTimersByTime(29 * 60_000);
    expect(session.get()).not.toBeNull();
    expect(native.askStillLifting).not.toHaveBeenCalled();
    jest.advanceTimersByTime(60_000 + 1);
    expect(session.get()).toBeNull();
    expect(lastView().screen).toBe('none');
  });
});

describe('another day replacing the workout under way', () => {
  it('ends the live session as it stands, stores it, and closes', () => {
    session.start(1_000);
    session.dispatch({ type: 'setLogged', reps: 5, at: 1_500 });
    session.abandon(2_000);
    expect(session.get()).toBeNull();
    expect(advanceNextDay).not.toHaveBeenCalled();
    expect(native.endRest).toHaveBeenCalled();
    expect(native.endWorkout).toHaveBeenCalledTimes(1);
    expect(lastView().screen).toBe('none');
  });
});
