import { describe, expect, it } from '@jest/globals';
import { scoreExercise } from './scoring';

const fiveByFive = { sets: 5, reps: 5 };

describe('scoreExercise', () => {
  it('is skipped when nothing was logged', () => {
    expect(scoreExercise(fiveByFive, [])).toBe('skipped');
  });

  it('is a hit when every prescribed set reaches the target reps', () => {
    const sets = [5, 5, 5, 5, 5].map((reps) => ({ reps }));
    expect(scoreExercise(fiveByFive, sets)).toBe('hit');
  });

  it('is a hit when sets exceed the target reps', () => {
    const sets = [6, 5, 7, 5, 5].map((reps) => ({ reps }));
    expect(scoreExercise(fiveByFive, sets)).toBe('hit');
  });

  it('is a failure when any set falls short — "4 of 5 sets hit"', () => {
    const sets = [5, 5, 5, 5, 4].map((reps) => ({ reps }));
    expect(scoreExercise(fiveByFive, sets)).toBe('failed');
  });

  it('is a failure when the workout ended early with sets missing — "only 3 of 5 sets done"', () => {
    const sets = [5, 5, 5].map((reps) => ({ reps }));
    expect(scoreExercise(fiveByFive, sets)).toBe('failed');
  });

  it('ignores bonus sets beyond the prescription', () => {
    const sets = [5, 5, 5, 5, 5, 2].map((reps) => ({ reps }));
    expect(scoreExercise(fiveByFive, sets)).toBe('hit');
  });
});
