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

const clock = { startedAt: 0, now: 0, avgBpm: null };
const curl: SessionExercise = { ...squat, exerciseId: 'curl', name: 'Curl', weight: 30 };
const dayA = { dayId: 'a', order: 0, name: 'Day 1', exercises: [squat] };
const dayB = { dayId: 'b', order: 1, name: 'Day 2', exercises: [curl, squat] };
const oneDay = { dayOrder: 0, days: [dayA] };
const twoDays = { dayOrder: 0, days: [dayA, dayB] };

describe('what the watch shows', () => {
  it('a set to log: the lift, its pips, the weight and target reps', () => {
    const view = watchView(startSession('plan', [squat]), clock, oneDay);
    expect(view).toMatchObject({
      screen: 'set',
      exerciseNo: 1,
      exercise: 'Squat',
      setsDone: 0,
      setsTotal: 5,
      setNo: 1,
      dayDone: 0,
      dayTotal: 5,
      canUnskip: false,
      dayOrder: 0,
      canChange: false,
      weight: 135,
      unit: 'Lbs',
      reps: 5,
      restEndsAt: 0,
      recovered: false,
    });
  });

  it('Change Workout is offered while the workout is untouched and the plan has another day', () => {
    const fresh = startSession('plan', [squat]);
    expect(watchView(fresh, clock, twoDays)).toMatchObject({
      canChange: true,
      days: [
        {
          order: 0,
          name: 'Day 1',
          lifts: [{ name: 'Squat', weight: 135, sets: 5, reps: 5, rest: 90 }],
        },
        { order: 1, name: 'Day 2', lifts: [{ name: 'Curl', weight: 30 }, { name: 'Squat' }] },
      ],
    });
    // One day: nothing to change to.
    expect(watchView(fresh, clock, oneDay)).toMatchObject({ canChange: false });
    // A logged set, or a skip, and the card is gone.
    const logged = reduce(fresh, { type: 'setLogged', reps: 5, at: 1 });
    expect(watchView(logged, clock, twoDays)).toMatchObject({ canChange: false });
    const skipped = reduce(fresh, { type: 'setSkipped', at: 1 });
    expect(watchView(skipped, clock, twoDays)).toMatchObject({ canChange: false });
  });

  it("the set carries the rest the next Log would start, and the phone's ack of the wrist", () => {
    const fresh = startSession('plan', [squat]);
    expect(watchView(fresh, clock, oneDay, 0, 41)).toMatchObject({
      screen: 'set',
      restSeconds: 90,
      tapAck: 41,
      startedAt: clock.startedAt,
    });
    const over = reduce(fresh, { type: 'workoutEnded', at: 1 });
    expect(watchView(over, clock, oneDay, 0, 41)).toMatchObject({ screen: 'done', tapAck: 41 });
  });

  it('a rest: when it ends, how long it was, and whether the gate is green', () => {
    let state = reduce(startSession('plan', [squat]), { type: 'setLogged', reps: 5, at: 10_000 });
    expect(watchView(state, clock, oneDay)).toMatchObject({
      screen: 'rest',
      setsDone: 1,
      dayDone: 1,
      restEndsAt: 100_000,
      restSeconds: 90,
      recovered: false,
      recoveredBelowBpm: 120,
      approachingUpToBpm: 140,
    });
    state = reduce(state, { type: 'recoveredChanged', recovered: true });
    expect(watchView(state, clock, oneDay)).toMatchObject({ screen: 'rest', recovered: true });
  });

  it('a skipped set moves the current pip past the done ones, so the watch sees the skip', () => {
    const state = reduce(startSession('plan', [squat]), { type: 'setSkipped', at: 1 });
    expect(watchView(state, clock, oneDay)).toMatchObject({
      screen: 'set',
      setsDone: 0,
      setNo: 2,
      canUnskip: true,
    });
    const resting = reduce(state, { type: 'setLogged', reps: 5, at: 2 });
    expect(watchView(resting, clock, oneDay)).toMatchObject({ screen: 'rest', canUnskip: true });
    expect(watchView(reduce(resting, { type: 'setUnskipped' }), clock, oneDay)).toMatchObject({
      canUnskip: false,
    });
  });

  it('Session Done: time, total weight, average heart rate, lifts done', () => {
    let state = reduce(startSession('plan', [squat]), { type: 'setLogged', reps: 5, at: 10_000 });
    state = reduce(state, { type: 'restEnded', reason: 'continue', at: 40_000 });
    state = reduce(state, { type: 'workoutEnded', at: 100_000 });
    expect(watchView(state, { startedAt: 1_500, now: 100_000, avgBpm: 123.6 }, oneDay)).toEqual({
      screen: 'done',
      tapAck: 0,
      durationSeconds: 98,
      volume: 675,
      avgBpm: 124,
      exercisesDone: 1,
    });
    expect(watchView(state, { startedAt: 0, now: 0, avgBpm: null }, oneDay)).toMatchObject({
      avgBpm: null,
    });
  });
});

describe('a tap on the watch', () => {
  it('Log becomes the same setLogged the phone button sends', () => {
    expect(watchActionToEvent({ type: 'logSet', reps: 4, day: -1, id: 0, at: 0 }, 5, [])).toEqual({
      type: 'setLogged',
      reps: 4,
      at: 5,
    });
    expect(
      watchActionToEvent({ type: 'logSet', reps: 0, day: -1, id: 0, at: 0 }, 5, []),
    ).toBeNull();
  });

  it('Continue ends the rest by choice', () => {
    expect(watchActionToEvent({ type: 'continue', reps: 0, day: -1, id: 0, at: 0 }, 7, [])).toEqual(
      {
        type: 'restEnded',
        reason: 'continue',
        at: 7,
      },
    );
  });

  it("Skip Set and End Workout are the machine's own events; the watch confirmed End", () => {
    expect(watchActionToEvent({ type: 'skipSet', reps: 0, day: -1, id: 0, at: 0 }, 3, [])).toEqual({
      type: 'setSkipped',
      at: 3,
    });
    expect(
      watchActionToEvent({ type: 'endWorkout', reps: 0, day: -1, id: 0, at: 0 }, 4, []),
    ).toEqual({
      type: 'workoutEnded',
      at: 4,
    });
  });

  it("Undo Skip is the machine's setUnskipped", () => {
    expect(
      watchActionToEvent({ type: 'unskipSet', reps: 0, day: -1, id: 0, at: 0 }, 9, []),
    ).toEqual({
      type: 'setUnskipped',
    });
  });

  it("Start Workout on a day preview is the machine's dayChanged with that day's lifts", () => {
    expect(
      watchActionToEvent({ type: 'changeDay', reps: 0, day: 1, id: 0, at: 0 }, 1, [dayA, dayB]),
    ).toEqual({
      type: 'dayChanged',
      exercises: [curl, squat],
    });
    // A day the phone does not know is ignored.
    expect(
      watchActionToEvent({ type: 'changeDay', reps: 0, day: 7, id: 0, at: 0 }, 1, [dayA, dayB]),
    ).toBeNull();
  });

  it('Finish is navigation, not a machine event — the session handles it', () => {
    expect(
      watchActionToEvent({ type: 'finish', reps: 0, day: -1, id: 0, at: 0 }, 1, []),
    ).toBeNull();
  });

  it('anything unknown is ignored', () => {
    expect(watchActionToEvent({ type: 'dance', reps: 0, day: -1, id: 0, at: 0 }, 1, [])).toBeNull();
  });

  it('a Log during a rest, or a Continue while logging, changes nothing (machine guards)', () => {
    const logging = startSession('plan', [squat]);
    const cont = watchActionToEvent({ type: 'continue', reps: 0, day: -1, id: 0, at: 0 }, 1, []);
    expect(reduce(logging, cont!)).toBe(logging);
    const resting = reduce(logging, { type: 'setLogged', reps: 5, at: 1 });
    const log = watchActionToEvent({ type: 'logSet', reps: 5, day: -1, id: 0, at: 0 }, 2, []);
    expect(reduce(resting, log!)).toBe(resting);
  });
});
