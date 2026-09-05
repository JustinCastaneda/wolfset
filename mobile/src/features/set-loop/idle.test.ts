import { describe, expect, it } from '@jest/globals';

import { idleEndsAt, idleVerdict, isLifterActivity, nextIdleCheckAt } from './idle';

const MIN = 60_000;
const HOUR = 60 * MIN;

describe('the forgotten-workout rule', () => {
  it('asks after twenty idle minutes and ends after thirty', () => {
    expect(idleVerdict(0, 0, 19 * MIN)).toBe('active');
    expect(idleVerdict(0, 0, 20 * MIN)).toBe('prompt');
    expect(idleVerdict(0, 0, 29 * MIN)).toBe('prompt');
    expect(idleVerdict(0, 0, 30 * MIN)).toBe('end');
  });

  it('ends at three hours whatever the lifter did last', () => {
    expect(idleEndsAt(3 * HOUR - 5 * MIN, 0)).toBe(3 * HOUR);
    expect(idleVerdict(3 * HOUR - 5 * MIN, 0, 3 * HOUR)).toBe('end');
    // Near the ceiling the prompt would land after the end: the end comes first.
    expect(nextIdleCheckAt(3 * HOUR - 5 * MIN, 0, 3 * HOUR - 4 * MIN)).toBe(3 * HOUR);
  });

  it('knows the next moment worth checking', () => {
    expect(nextIdleCheckAt(0, 0, 5 * MIN)).toBe(20 * MIN);
    expect(nextIdleCheckAt(0, 0, 25 * MIN)).toBe(30 * MIN);
    expect(nextIdleCheckAt(0, 0, 30 * MIN)).toBeNull();
  });

  it('counts only what the lifter does', () => {
    expect(isLifterActivity({ type: 'setLogged', reps: 5, at: 1 })).toBe(true);
    expect(isLifterActivity({ type: 'restEnded', reason: 'continue', at: 1 })).toBe(true);
    expect(isLifterActivity({ type: 'restEnded', reason: 'timer', at: 1 })).toBe(false);
    expect(isLifterActivity({ type: 'recoveredChanged', recovered: true })).toBe(false);
    expect(isLifterActivity({ type: 'weightSaved', weight: 100 })).toBe(true);
  });
});
