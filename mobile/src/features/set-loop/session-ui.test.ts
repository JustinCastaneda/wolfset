import { describe, expect, it } from '@jest/globals';
import { reduce, startSession } from './machine';
import { dayProgress, estimatedMinutes, formatClock, loopTitle, sessionTotals } from './session-ui';
import type { SessionExercise } from './types';

const squat: SessionExercise = {
  exerciseId: 'squat',
  name: 'Squat',
  prescribedSets: 2,
  targetReps: 5,
  weight: 135,
  restSeconds: 90,
  autoStartTimer: true,
};

describe('loop screen helpers', () => {
  it('titles read "Day • Lift • set/total", capped at the total', () => {
    const s = startSession('plan', [squat]);
    expect(loopTitle('Workout A', s)).toBe('Workout A • Squat • 1/2');
  });

  it('freestyle titles count up without a total', () => {
    const s = startSession('freestyle', [{ ...squat, prescribedSets: null }]);
    expect(loopTitle('Freestyle', s)).toBe('Freestyle • Squat • Set 1');
  });

  it('the day bar counts every logged set against every prescribed set', () => {
    let s = startSession('plan', [squat, { ...squat, exerciseId: 'b', prescribedSets: 3 }]);
    expect(dayProgress(s)).toEqual({ done: 0, total: 5 });
    s = reduce(s, { type: 'setLogged', reps: 5, at: 0 });
    expect(dayProgress(s)).toEqual({ done: 1, total: 5 });
  });

  it('the clock formats like the frames: 1:45, 0:07', () => {
    expect(formatClock(105)).toBe('1:45');
    expect(formatClock(7)).toBe('0:07');
    expect(formatClock(0)).toBe('0:00');
  });

  it('totals sum weight × reps across logged sets', () => {
    let s = startSession('plan', [squat]);
    s = reduce(s, { type: 'setLogged', reps: 5, at: 0 });
    s = reduce(s, { type: 'restEnded', reason: 'timer', at: 1 });
    s = reduce(s, { type: 'setLogged', reps: 4, at: 2 });
    expect(sessionTotals(s)).toEqual({ volume: 135 * 9, sets: 2 });
  });
});

describe('estimatedMinutes', () => {
  it('charges every prescribed set its rest plus 45 s of lifting, in whole minutes', () => {
    const lift = (sets: number | null, restSeconds: number) =>
      ({
        exerciseId: 'x',
        name: 'x',
        prescribedSets: sets,
        targetReps: 5,
        weight: 100,
        restSeconds,
        autoStartTimer: true,
      }) as const;
    // 5 × (90 + 45) = 675 s → 11 min; 3 × (60 + 45) = 315 s → 5 min; together 990 s → 17.
    expect(estimatedMinutes([lift(5, 90)])).toBe(11);
    expect(estimatedMinutes([lift(5, 90), lift(3, 60)])).toBe(17);
  });

  it('counts an open-ended lift as nothing, since it has no sets to plan', () => {
    expect(
      estimatedMinutes([
        {
          exerciseId: 'x',
          name: 'x',
          prescribedSets: null,
          targetReps: 5,
          weight: 100,
          restSeconds: 90,
          autoStartTimer: true,
        },
      ]),
    ).toBe(0);
  });
});
