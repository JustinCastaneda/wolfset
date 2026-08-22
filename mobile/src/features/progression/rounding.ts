/**
 * Round a weight to the nearest weight that can actually be loaded (decision 11c):
 * a multiple of the gym's smallest step for this load type. 121.5 on a 5 lb barbell
 * step → 120; on a 2.5 lb dumbbell step → 122.5.
 *
 * Exact ties (e.g. 122.5 with a 5 lb step) round DOWN. This is used for deloads, where
 * rounding up would make the deload smaller than asked for.
 */
export function roundToLoadable(weight: number, smallestStep: number): number {
  if (smallestStep <= 0) throw new Error(`smallestStep must be positive, got ${smallestStep}`);
  const steps = weight / smallestStep;
  const lower = Math.floor(steps);
  const remainder = steps - lower;
  // Floating point: treat "within a hair of .5" as a tie so 24.5 doesn't become 24.4999.
  const isTie = Math.abs(remainder - 0.5) < 1e-9;
  const rounded = isTie ? lower : Math.round(steps);
  return fixFloat(rounded * smallestStep);
}

/** Apply a percentage deload and land on a loadable weight. */
export function deloadWeight(weight: number, percent: number, smallestStep: number): number {
  return roundToLoadable(weight * (1 - percent / 100), smallestStep);
}

/** 0.1 + 0.2 style noise removal — weights never need more than 2 decimals. */
function fixFloat(n: number): number {
  return Math.round(n * 100) / 100;
}
