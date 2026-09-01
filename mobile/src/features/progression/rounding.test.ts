import { describe, expect, it } from '@jest/globals';
import { deloadWeight, roundToLoadable } from './rounding';

describe('roundToLoadable', () => {
  it('leaves a weight that is already loadable alone', () => {
    expect(roundToLoadable(135, 5)).toBe(135);
    expect(roundToLoadable(122.5, 2.5)).toBe(122.5);
  });

  it('rounds 121.5 to 120 on a 5 lb barbell step (decision 11c example)', () => {
    expect(roundToLoadable(121.5, 5)).toBe(120);
  });

  it('rounds 121.5 to 122.5 on a 2.5 lb dumbbell step', () => {
    expect(roundToLoadable(121.5, 2.5)).toBe(122.5);
  });

  it('rounds up when the nearest loadable weight is above', () => {
    expect(roundToLoadable(123.9, 5)).toBe(125);
  });

  it('rounds an exact tie down, so a deload is never smaller than asked for', () => {
    expect(roundToLoadable(122.5, 5)).toBe(120);
  });

  it('does not accumulate floating-point noise', () => {
    expect(roundToLoadable(0.1 + 0.2, 0.1)).toBe(0.3);
  });

  it('rejects a zero or negative step instead of dividing by it', () => {
    expect(() => roundToLoadable(100, 0)).toThrow();
    expect(() => roundToLoadable(100, -5)).toThrow();
  });
});

describe('deloadWeight', () => {
  it('drops 10% of 135 and lands on 120 with 5 lb steps', () => {
    expect(deloadWeight(135, 10, 5)).toBe(120);
  });

  it('drops 10% of 135 and lands on 122.5 with 2.5 lb steps', () => {
    expect(deloadWeight(135, 10, 2.5)).toBe(122.5);
  });

  it('honours a per-exercise deload percent', () => {
    expect(deloadWeight(200, 20, 5)).toBe(160);
  });
});
