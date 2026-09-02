// The name suggestions under the Plan Name field (Figma 114:3014): a memorable example,
// the next plan number, and a surprise. Pure — the screen supplies the count and the dice.

export const EXAMPLE_NAME = 'Winter Bulk';

export const SURPRISE_NAMES = [
  'Iron Season',
  'Quiet Strength',
  'Big Cold Lifts',
  'Sunrise Sets',
  'The Long Grind',
  'Heavy Weather',
  'Pack Mentality',
  'Full Moon Squats',
] as const;

/** "Plan 4" when three plans already exist. */
export function numberedPlanName(existingPlans: number): string {
  return `Plan ${existingPlans + 1}`;
}

/** A surprise that is never the name already in the field, so the chip always changes
 *  something. `roll` is a number in [0, 1) — injected so the pick is testable. */
export function surprisePlanName(current: string, roll: number): string {
  const pool = SURPRISE_NAMES.filter((n) => n !== current);
  const index = Math.min(pool.length - 1, Math.max(0, Math.floor(roll * pool.length)));
  return pool[index];
}

/** A plan needs a real name — whitespace alone doesn't count. */
export function isValidPlanName(name: string): boolean {
  return name.trim().length > 0;
}
