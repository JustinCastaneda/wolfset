import { describe, expect, it } from '@jest/globals';

import type { StoredProgress } from '@/lib/db/progress-store';
import { applyProgress } from './plan-day';
import type { SessionExercise } from './types';

const squat: SessionExercise = {
  exerciseId: 'squat',
  name: 'Squat',
  prescribedSets: 5,
  targetReps: 5,
  weight: 135,
  restSeconds: 90,
  autoStartTimer: true,
};
const curl: SessionExercise = { ...squat, exerciseId: 'curl', name: 'Curl', weight: 30 };

const progress = (over: Partial<StoredProgress>): StoredProgress => ({
  currentWeight: 145,
  consecutiveFailures: 0,
  lastOutcome: 'hit',
  currentReps: 8,
  lastReserve: null,
  lastForm: null,
  heldAtTop: false,
  ...over,
});

describe('applyProgress — a plan day as the session would start it', () => {
  it('a lift with stored progress starts at its current weight; one without keeps the plan start', () => {
    const [s, c] = applyProgress([squat, curl], { squat: progress({}) });
    expect(s.weight).toBe(145);
    expect(c.weight).toBe(30);
  });

  it('steady lifts keep the plan reps even when progress carries a rep count', () => {
    const [s] = applyProgress([squat], { squat: progress({ currentReps: 8 }) });
    expect(s.targetReps).toBe(5);
  });

  it('by-feel and reps-first lifts take the moving rep target', () => {
    const [byFeel, repsFirst] = applyProgress(
      [
        { ...squat, strategy: 'by-feel' },
        { ...curl, strategy: 'reps-first' },
      ],
      { squat: progress({ currentReps: 8 }), curl: progress({ currentReps: 12 }) },
    );
    expect(byFeel.targetReps).toBe(8);
    expect(repsFirst.targetReps).toBe(12);
  });
});
