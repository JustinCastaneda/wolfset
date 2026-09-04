import { describe, expect, it } from '@jest/globals';

import type { ActivePlan } from '@/lib/db/plan-store';
import { watchStartOpensSession } from './watch-start';

const day = (isNext: boolean, exercises: number) =>
  ({ dayId: `d${isNext}`, name: 'Day', isNext, exercises: Array(exercises).fill({}) }) as never;

const plan = (...days: ActivePlan['days']) => ({ planId: 'p', planName: 'P', days }) as ActivePlan;

describe('Next Workout on the watch', () => {
  it('opens the session from the hub when the up-next day has exercises', () => {
    expect(watchStartOpensSession('/', plan(day(false, 3), day(true, 2)))).toBe(true);
  });

  it('opens it from any other screen too, such as Settings', () => {
    expect(watchStartOpensSession('/settings', plan(day(true, 1)))).toBe(true);
  });

  it('does nothing while the session screen is already up', () => {
    expect(watchStartOpensSession('/session', plan(day(true, 1)))).toBe(false);
  });

  it('does nothing without a plan, or when the up-next day is empty', () => {
    expect(watchStartOpensSession('/', null)).toBe(false);
    expect(watchStartOpensSession('/', plan(day(true, 0)))).toBe(false);
  });
});
