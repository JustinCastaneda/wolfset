import { describe, expect, it } from '@jest/globals';
import { applyByFeel } from './by-feel';
import type { ByFeelHistory, ExerciseProgress, Prescription } from './types';

// A By Feel squat: range 5–8 (the engine's default), +5 lb, 5 lb steps, deload 10%.
const squat: Prescription = {
  sets: 3,
  reps: 5,
  increment: 5,
  repCeiling: 20,
  progression: { strategy: 'by-feel', repRangeMin: 5, repRangeMax: 8 },
  deload: { percent: 10, afterFailures: 2 },
  smallestStep: 5,
};

const fresh: ExerciseProgress = {
  currentWeight: 225,
  currentReps: 5,
  consecutiveFailures: 0,
  lastOutcome: null,
};

const rated = (
  reserve: '0' | '1' | '2' | '3' | '4plus',
  form: 'clean' | 'bad' = 'clean',
): { outcome: 'hit'; rating: { reserve: typeof reserve; form: typeof form } } => ({
  outcome: 'hit',
  rating: { reserve, form },
});

describe('step 1 + 2 — poke picks steps, range picks the lever', () => {
  it('all reps · plenty left · clean → 2 steps: 5 reps become 7', () => {
    const { progress, prompt } = applyByFeel(fresh, rated('4plus'), null, squat);
    expect(progress.currentReps).toBe(7);
    expect(progress.currentWeight).toBe(225);
    expect(prompt).toBeNull();
  });

  it('reserve 3 also counts as plenty left', () => {
    expect(applyByFeel(fresh, rated('3'), null, squat).progress.currentReps).toBe(7);
  });

  it('all reps · 1–2 left · clean → 1 step: 5 reps become 6', () => {
    expect(applyByFeel(fresh, rated('1'), null, squat).progress.currentReps).toBe(6);
    expect(applyByFeel(fresh, rated('2'), null, squat).progress.currentReps).toBe(6);
  });

  it('all reps · nothing left · clean → hold', () => {
    const { progress } = applyByFeel(fresh, rated('0'), null, squat);
    expect(progress.currentReps).toBe(5);
    expect(progress.currentWeight).toBe(225);
  });

  it('steps cap at the top of the range: 7 + 2 steps stops at 8', () => {
    const atSeven = { ...fresh, currentReps: 7 };
    expect(applyByFeel(atSeven, rated('4plus'), null, squat).progress.currentReps).toBe(8);
  });

  it('at the top of the range, steps become weight: +5, reps reset to 5', () => {
    const atTop = { ...fresh, currentReps: 8 };
    const { progress } = applyByFeel(atTop, rated('1'), null, squat);
    expect(progress.currentWeight).toBe(230);
    expect(progress.currentReps).toBe(5);
  });

  it('the added weight lands on a loadable step', () => {
    const dumbbell = {
      ...squat,
      increment: 2.5,
      smallestStep: 2.5,
      progression: { strategy: 'by-feel' as const, repRangeMin: 5, repRangeMax: 8 },
    };
    const atTop = { ...fresh, currentWeight: 50, currentReps: 8 };
    expect(applyByFeel(atTop, rated('2'), null, dumbbell).progress.currentWeight).toBe(52.5);
  });
});

describe('form broke', () => {
  it('while grinding (reserve ≤ 2) → deload 10% to a loadable weight', () => {
    const { progress } = applyByFeel(fresh, rated('0', 'bad'), null, squat);
    expect(progress.currentWeight).toBe(200); // 225 × 0.9 = 202.5, tie rounds down to 200
    expect(progress.currentReps).toBe(5);
  });

  it('at plenty left → hold, the weight is not the problem', () => {
    const { progress } = applyByFeel(fresh, rated('4plus', 'bad'), null, squat);
    expect(progress.currentWeight).toBe(225);
    expect(progress.currentReps).toBe(5);
  });
});

describe('missed reps', () => {
  it('one missed session → hold', () => {
    const { progress } = applyByFeel(fresh, { outcome: 'failed', rating: null }, null, squat);
    expect(progress.currentWeight).toBe(225);
    expect(progress.lastOutcome).toBe('failed');
  });

  it('missed two sessions running → deload 10%', () => {
    const previous: ByFeelHistory = { outcome: 'failed', rating: null, heldAtTop: false };
    const { progress } = applyByFeel(fresh, { outcome: 'failed', rating: null }, previous, squat);
    expect(progress.currentWeight).toBe(200);
  });

  it('a hit between misses breaks the streak', () => {
    const previous: ByFeelHistory = { outcome: 'hit', rating: null, heldAtTop: false };
    const { progress } = applyByFeel(fresh, { outcome: 'failed', rating: null }, previous, squat);
    expect(progress.currentWeight).toBe(225);
  });
});

describe('held at the top of the range', () => {
  it('two sessions running → add weight anyway', () => {
    const atTop = { ...fresh, currentReps: 8 };
    const previous: ByFeelHistory = { outcome: 'hit', rating: null, heldAtTop: true };
    const { progress } = applyByFeel(atTop, rated('0'), previous, squat);
    expect(progress.currentWeight).toBe(230);
    expect(progress.currentReps).toBe(5);
  });

  it('first held session → just hold', () => {
    const atTop = { ...fresh, currentReps: 8 };
    const { progress } = applyByFeel(atTop, rated('0'), null, squat);
    expect(progress.currentWeight).toBe(225);
    expect(progress.currentReps).toBe(8);
  });
});

describe('unrated', () => {
  it('one skipped grid → hold, no prompt', () => {
    const { progress, prompt } = applyByFeel(fresh, { outcome: 'hit', rating: null }, null, squat);
    expect(progress.currentReps).toBe(5);
    expect(prompt).toBeNull();
  });

  it('unrated two sessions running → hold and offer switching to Steady', () => {
    const previous: ByFeelHistory = { outcome: 'hit', rating: null, heldAtTop: false };
    const { prompt } = applyByFeel(fresh, { outcome: 'hit', rating: null }, previous, squat);
    expect(prompt).toBe('offer-steady');
  });
});

describe('guard rails', () => {
  it('rejects a non-by-feel prescription', () => {
    const steady = { ...squat, progression: { strategy: 'steady' as const } };
    expect(() => applyByFeel(fresh, rated('1'), null, steady)).toThrow();
  });

  it('never mutates the input', () => {
    const input = { ...fresh };
    applyByFeel(input, rated('4plus'), null, squat);
    applyByFeel(input, rated('0', 'bad'), null, squat);
    expect(input).toEqual(fresh);
  });
});
