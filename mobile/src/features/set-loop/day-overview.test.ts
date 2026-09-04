import { describe, expect, it } from '@jest/globals';
import { startAction, startLabel } from './day-overview';

describe('startAction — the Day Overview button (34:778)', () => {
  it('an empty day has nothing to start', () => {
    expect(startAction({ exerciseCount: 0, isNext: false, inProgressName: null })).toEqual({
      kind: 'none',
    });
  });

  it('with nothing under way, any day starts', () => {
    expect(startAction({ exerciseCount: 6, isNext: false, inProgressName: null })).toEqual({
      kind: 'start',
    });
  });

  it('the day under way resumes', () => {
    const action = startAction({ exerciseCount: 6, isNext: true, inProgressName: 'Workout B' });
    expect(action).toEqual({ kind: 'resume' });
    expect(startLabel(action)).toBe('Resume Workout');
  });

  it('another day replaces the one under way — red button, drawer first', () => {
    const action = startAction({ exerciseCount: 6, isNext: false, inProgressName: 'Workout B' });
    expect(action).toEqual({ kind: 'replace', inProgressName: 'Workout B' });
    expect(startLabel(action)).toBe('Start Workout');
  });
});
