import { describe, expect, it } from '@jest/globals';

import { reduce, startSession } from './machine';
import type { SessionExercise } from './types';
import { watchActionToEvent, watchView } from './watch-view';

const squat: SessionExercise = {
  exerciseId: 'squat',
  name: 'Squat',
  prescribedSets: 5,
  targetReps: 5,
  weight: 135,
  restSeconds: 90,
  autoStartTimer: true,
};

describe('what the watch shows', () => {
  it('a set to log: the lift, its pips, the weight and target reps', () => {
    const view = watchView(startSession('plan', [squat]));
    expect(view).toMatchObject({
      screen: 'set',
      exerciseNo: 1,
      exercise: 'Squat',
      setsDone: 0,
      setsTotal: 5,
      weight: 135,
      unit: 'Lbs',
      reps: 5,
      restEndsAt: 0,
      recovered: false,
    });
  });

  it('a rest: when it ends, how long it was, and whether the gate is green', () => {
    let state = reduce(startSession('plan', [squat]), { type: 'setLogged', reps: 5, at: 10_000 });
    expect(watchView(state)).toMatchObject({
      screen: 'rest',
      setsDone: 1,
      restEndsAt: 100_000,
      restSeconds: 90,
      recovered: false,
      recoveredBelowBpm: 120,
      approachingUpToBpm: 140,
    });
    state = reduce(state, { type: 'recoveredChanged', recovered: true });
    expect(watchView(state)).toMatchObject({ screen: 'rest', recovered: true });
  });

  it('nothing once the session is done', () => {
    const state = reduce(startSession('plan', [squat]), { type: 'workoutEnded', at: 1 });
    expect(watchView(state)).toEqual({ screen: 'none' });
  });
});

describe('a tap on the watch', () => {
  it('Log becomes the same setLogged the phone button sends', () => {
    expect(watchActionToEvent({ type: 'logSet', reps: 4 }, 5)).toEqual({
      type: 'setLogged',
      reps: 4,
      at: 5,
    });
    expect(watchActionToEvent({ type: 'logSet', reps: 0 }, 5)).toBeNull();
  });

  it('Continue ends the rest by choice', () => {
    expect(watchActionToEvent({ type: 'continue', reps: 0 }, 7)).toEqual({
      type: 'restEnded',
      reason: 'continue',
      at: 7,
    });
  });

  it('anything unknown is ignored', () => {
    expect(watchActionToEvent({ type: 'dance', reps: 0 }, 1)).toBeNull();
  });

  it('a Log during a rest, or a Continue while logging, changes nothing (machine guards)', () => {
    const logging = startSession('plan', [squat]);
    const cont = watchActionToEvent({ type: 'continue', reps: 0 }, 1);
    expect(reduce(logging, cont!)).toBe(logging);
    const resting = reduce(logging, { type: 'setLogged', reps: 5, at: 1 });
    const log = watchActionToEvent({ type: 'logSet', reps: 5 }, 2);
    expect(reduce(resting, log!)).toBe(resting);
  });
});
