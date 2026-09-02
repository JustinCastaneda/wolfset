import { describe, expect, it } from '@jest/globals';
import { reduce, startSession } from './machine';
import { acceptDeload, settleSession } from './settle-session';
import type { SessionExercise, SessionState } from './types';

const squat: SessionExercise = {
  exerciseId: 'squat',
  name: 'Squat',
  prescribedSets: 2,
  targetReps: 5,
  weight: 85,
  restSeconds: 90,
  autoStartTimer: true,
};

function run(reps: number[], exercises = [squat]): SessionState {
  let s = startSession('plan', exercises);
  for (const [i, r] of reps.entries()) {
    s = reduce(s, { type: 'setLogged', reps: r, at: i * 1000 });
    if (s.phase.name === 'resting')
      s = reduce(s, { type: 'restEnded', reason: 'timer', at: i * 1000 + 500 });
  }
  return reduce(s, { type: 'workoutEnded', at: 99_000 });
}

describe('settleSession — the workout moves next session (data-model §5.2)', () => {
  it('a hit adds the increment: next squat is 90', () => {
    const [s] = settleSession(run([5, 5]), {});
    expect(s.outcome).toBe('hit');
    expect(s.prevWeight).toBe(85);
    expect(s.nextWeight).toBe(90);
    expect(s.progress).toEqual({ currentWeight: 90, consecutiveFailures: 0, lastOutcome: 'hit' });
    expect(s.plateau).toBeNull();
  });

  it('a failed lift holds the weight and counts the streak', () => {
    const [s] = settleSession(run([5, 4]), {});
    expect(s.outcome).toBe('failed');
    expect(s.nextWeight).toBe(85);
    expect(s.progress.consecutiveFailures).toBe(1);
    expect(s.plateau).toBeNull();
  });

  it('a second straight failure raises the plateau question with the deload target', () => {
    const [s] = settleSession(run([5, 4]), {
      squat: { currentWeight: 85, consecutiveFailures: 1, lastOutcome: 'failed' },
    });
    expect(s.plateau).toEqual({ deloadTo: 75 }); // 85 × 0.9 = 76.5 → 75 on 5 lb steps
    expect(s.nextWeight).toBe(85); // nothing changes until the user answers
  });

  it('accepting the deload stores the dropped weight and clears the streak', () => {
    const [s] = settleSession(run([5, 4]), {
      squat: { currentWeight: 85, consecutiveFailures: 1, lastOutcome: 'failed' },
    });
    expect(acceptDeload(s)).toEqual({
      currentWeight: 75,
      consecutiveFailures: 0,
      lastOutcome: null,
    });
  });

  it('a skipped lift changes nothing — a miss is not a failure', () => {
    const done = run([]); // ended with zero sets
    const [s] = settleSession(done, {
      squat: { currentWeight: 85, consecutiveFailures: 1, lastOutcome: 'failed' },
    });
    expect(s.outcome).toBe('skipped');
    expect(s.nextWeight).toBe(85);
    expect(s.progress.consecutiveFailures).toBe(1);
  });

  it('progresses from the session weight when Edit Weights moved it', () => {
    let st = startSession('plan', [squat]);
    st = reduce(st, { type: 'weightEditOpened' });
    st = reduce(st, { type: 'weightSaved', weight: 95 });
    st = reduce(st, { type: 'setLogged', reps: 5, at: 0 });
    st = reduce(st, { type: 'restEnded', reason: 'timer', at: 1 });
    st = reduce(st, { type: 'setLogged', reps: 5, at: 2 });
    const [s] = settleSession(st, {});
    expect(s.prevWeight).toBe(95);
    expect(s.nextWeight).toBe(100);
  });
});
