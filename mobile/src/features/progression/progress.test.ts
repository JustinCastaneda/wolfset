import { describe, expect, it } from '@jest/globals';
import { applyDeload, applyOutcome } from './progress';
import type { ExerciseProgress, Prescription } from './types';

// A barbell squat, 5×5 at 135, plan defaults: +5 lb, deload 10% after 2 failures.
const squat: Prescription = {
  sets: 5,
  reps: 5,
  increment: 5,
  repCeiling: 20,
  progression: { strategy: 'steady' },
  deload: { percent: 10, afterFailures: 2 },
  smallestStep: 5,
};

const fresh: ExerciseProgress = {
  currentWeight: 135,
  currentReps: 5,
  consecutiveFailures: 0,
  lastOutcome: null,
};

describe('steady (progressive overload, the default)', () => {
  it('adds the increment after a hit and clears the failure streak', () => {
    const { progress, prompt } = applyOutcome({ ...fresh, consecutiveFailures: 1 }, 'hit', squat);
    expect(progress.currentWeight).toBe(140);
    expect(progress.consecutiveFailures).toBe(0);
    expect(progress.lastOutcome).toBe('hit');
    expect(prompt).toBeNull();
  });

  it('uses the per-exercise increment, not a global one', () => {
    const curl = { ...squat, increment: 2.5, smallestStep: 2.5 };
    expect(applyOutcome({ ...fresh, currentWeight: 30 }, 'hit', curl).progress.currentWeight).toBe(
      32.5,
    );
  });

  it('keeps the weight and counts one failure, with no prompt yet', () => {
    const { progress, prompt } = applyOutcome(fresh, 'failed', squat);
    expect(progress.currentWeight).toBe(135);
    expect(progress.consecutiveFailures).toBe(1);
    expect(prompt).toBeNull();
  });

  it('prompts at two consecutive failures instead of deciding (decision 11b)', () => {
    const afterOne = applyOutcome(fresh, 'failed', squat).progress;
    const { progress, prompt } = applyOutcome(afterOne, 'failed', squat);
    expect(prompt).toBe('plateau');
    // Nothing changed except the streak — the user has not chosen yet.
    expect(progress.currentWeight).toBe(135);
    expect(progress.consecutiveFailures).toBe(2);
  });

  it('a hit between two failures resets the streak, so no prompt', () => {
    const a = applyOutcome(fresh, 'failed', squat).progress;
    const b = applyOutcome(a, 'hit', squat).progress;
    const { prompt, progress } = applyOutcome(b, 'failed', squat);
    expect(prompt).toBeNull();
    expect(progress.consecutiveFailures).toBe(1);
  });

  it('honours a per-exercise failure threshold', () => {
    const patient = { ...squat, deload: { percent: 10, afterFailures: 3 } };
    const a = applyOutcome(fresh, 'failed', patient).progress;
    const b = applyOutcome(a, 'failed', patient);
    expect(b.prompt).toBeNull();
    expect(applyOutcome(b.progress, 'failed', patient).prompt).toBe('plateau');
  });
});

describe('skipped', () => {
  it('changes nothing — a miss is not a failure', () => {
    const streak = { ...fresh, consecutiveFailures: 1, lastOutcome: 'failed' as const };
    const { progress, prompt } = applyOutcome(streak, 'skipped', squat);
    expect(progress).toEqual(streak);
    expect(prompt).toBeNull();
  });
});

describe('reps-first', () => {
  const repsFirst: Prescription = {
    ...squat,
    reps: 5,
    repCeiling: 12,
    progression: { strategy: 'reps-first', repStep: 3 },
  };

  it('adds the rep step after a hit and holds the weight', () => {
    const { progress } = applyOutcome(fresh, 'hit', repsFirst);
    expect(progress.currentReps).toBe(8);
    expect(progress.currentWeight).toBe(135);
  });

  it('climbs to the ceiling: 5 → 8 → 11', () => {
    const a = applyOutcome(fresh, 'hit', repsFirst).progress;
    const b = applyOutcome(a, 'hit', repsFirst).progress;
    expect(b.currentReps).toBe(11);
    expect(b.currentWeight).toBe(135);
  });

  it('past the ceiling, steps the weight up and resets reps to the starting reps', () => {
    const atEleven = { ...fresh, currentReps: 11 };
    const { progress } = applyOutcome(atEleven, 'hit', repsFirst);
    expect(progress.currentWeight).toBe(140);
    expect(progress.currentReps).toBe(5);
  });

  it('does not step up when the rep step lands exactly on the ceiling', () => {
    const atNine = { ...fresh, currentReps: 9 };
    const { progress } = applyOutcome(atNine, 'hit', repsFirst);
    expect(progress.currentReps).toBe(12);
    expect(progress.currentWeight).toBe(135);
  });

  it('counts failures and prompts at the threshold, like steady', () => {
    const a = applyOutcome(fresh, 'failed', repsFirst).progress;
    expect(applyOutcome(a, 'failed', repsFirst).prompt).toBe('plateau');
  });
});

describe('by-feel', () => {
  const byFeel: Prescription = {
    ...squat,
    progression: { strategy: 'by-feel', repRangeMin: 5, repRangeMax: 8 },
  };

  it('changes no numbers on a hit', () => {
    const { progress, prompt } = applyOutcome(fresh, 'hit', byFeel);
    expect(progress.currentWeight).toBe(135);
    expect(progress.currentReps).toBe(5);
    expect(progress.lastOutcome).toBe('hit');
    expect(prompt).toBeNull();
  });

  it('does not count failures or prompt — by-feel outcomes go through applyByFeel instead', () => {
    const a = applyOutcome(fresh, 'failed', byFeel).progress;
    const { progress, prompt } = applyOutcome(a, 'failed', byFeel);
    expect(progress.consecutiveFailures).toBe(0);
    expect(prompt).toBeNull();
  });
});

describe('applyDeload — the user chose "deload" at the prompt', () => {
  it('drops 10% of 135 to a loadable 120 and clears the streak', () => {
    const stuck = { ...fresh, consecutiveFailures: 2, lastOutcome: 'failed' as const };
    const progress = applyDeload(stuck, squat);
    expect(progress.currentWeight).toBe(120);
    expect(progress.consecutiveFailures).toBe(0);
  });

  it('uses the per-exercise deload percent and step', () => {
    const dumbbell = {
      ...squat,
      deload: { percent: 20, afterFailures: 2 },
      smallestStep: 2.5,
    };
    expect(applyDeload({ ...fresh, currentWeight: 50 }, dumbbell).currentWeight).toBe(40);
  });
});

describe('purity', () => {
  it('never mutates the input', () => {
    const input = { ...fresh };
    applyOutcome(input, 'hit', squat);
    applyOutcome(input, 'failed', squat);
    applyDeload(input, squat);
    expect(input).toEqual(fresh);
  });
});
