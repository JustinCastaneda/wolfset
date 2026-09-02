import { describe, expect, it } from '@jest/globals';
import { SURPRISE_NAMES, isValidPlanName, numberedPlanName, surprisePlanName } from './plan-names';

describe('plan name suggestions (Figma 114:3014)', () => {
  it('numbers the next plan after the ones that exist', () => {
    expect(numberedPlanName(0)).toBe('Plan 1');
    expect(numberedPlanName(3)).toBe('Plan 4');
  });

  it('a surprise never repeats the name already in the field', () => {
    const current = SURPRISE_NAMES[0];
    for (const roll of [0, 0.25, 0.5, 0.999]) {
      expect(surprisePlanName(current, roll)).not.toBe(current);
    }
  });

  it('a surprise always comes from the list', () => {
    expect(SURPRISE_NAMES).toContain(surprisePlanName('', 0.42));
  });

  it('whitespace is not a plan name', () => {
    expect(isValidPlanName('   ')).toBe(false);
    expect(isValidPlanName(' Winter Bulk ')).toBe(true);
  });
});
