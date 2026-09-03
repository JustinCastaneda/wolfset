import { describe, expect, it } from '@jest/globals';
import { dayLetter, planSubtitle, suggestedWeek } from './week';

describe('Plan Summary — suggested week (123:2530)', () => {
  it('trains Mon / Wed / Fri, cycling the days by letter', () => {
    expect(suggestedWeek(2)).toEqual(['A', null, 'B', null, 'A', null, null]);
    expect(suggestedWeek(3)).toEqual(['A', null, 'B', null, 'C', null, null]);
    expect(suggestedWeek(1)).toEqual(['A', null, 'A', null, 'A', null, null]);
  });

  it('a plan with no days suggests nothing', () => {
    expect(suggestedWeek(0)).toEqual([null, null, null, null, null, null, null]);
  });

  it('letters follow day order', () => {
    expect(dayLetter(0)).toBe('A');
    expect(dayLetter(1)).toBe('B');
    expect(dayLetter(25)).toBe('Z');
  });

  it('writes the subtitle with the right plurals', () => {
    expect(planSubtitle('Reps First', 2, 6)).toBe('Reps First • 2 Days • 6 Exercises');
    expect(planSubtitle('Steady', 1, 1)).toBe('Steady • 1 Day • 1 Exercise');
  });
});
