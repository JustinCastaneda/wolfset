import { describe, expect, it } from '@jest/globals';
import { endSessionNow } from './end-session';
import { reduce, startSession } from './machine';
import type { SessionExercise } from './types';

const squat: SessionExercise = {
  exerciseId: 'squat',
  name: 'Squat',
  prescribedSets: 3,
  targetReps: 5,
  weight: 135,
  restSeconds: 90,
  autoStartTimer: true,
};
const goblet: SessionExercise = {
  ...squat,
  exerciseId: 'goblet',
  name: 'Goblet Squat',
  prescribedSets: 1,
  strategy: 'by-feel',
};

describe('endSessionNow — a workout left under way ends as it stands', () => {
  it('ends early with prescribed work left, so the unfinished lifts score as failures', () => {
    const state = reduce(startSession('plan', [squat, goblet]), {
      type: 'setLogged',
      reps: 5,
      at: 1_000,
    });
    const ended = endSessionNow(state, 5_000);
    expect(ended.phase).toEqual({ name: 'done', endedEarly: true });
    expect(ended.sets).toHaveLength(1);
  });

  it('closes a running rest at the moment it ended', () => {
    const resting = reduce(startSession('plan', [squat]), {
      type: 'setLogged',
      reps: 5,
      at: 1_000,
    });
    expect(resting.phase.name).toBe('resting');
    const ended = endSessionNow(resting, 61_000);
    expect(ended.sets[0]).toMatchObject({ restEndedAt: 61_000, restEndReason: 'continue' });
  });

  it('skips a poke grid still waiting, so its lift repeats progression', () => {
    // Goblet's one set completes it and queues the grid; the workout is not over.
    const state = reduce(startSession('plan', [goblet, squat]), {
      type: 'setLogged',
      reps: 10,
      at: 1_000,
    });
    expect(state.pendingRatings).toEqual([0]);
    const ended = endSessionNow(state, 2_000);
    expect(ended.pendingRatings).toEqual([]);
    expect(ended.feelRatings).toEqual({ 0: null });
    expect(ended.phase.name).toBe('done');
  });

  it('leaves a session that is already over untouched', () => {
    const done = {
      ...startSession('plan', [squat]),
      phase: { name: 'done', endedEarly: false } as const,
    };
    expect(endSessionNow(done, 9_000)).toBe(done);
  });
});
