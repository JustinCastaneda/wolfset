// ⚠️ PLACEHOLDER — the "recovered" rule is Phase 0's open exit criterion B (decisions.md):
// the real threshold comes from Justin's felt-ready readings, not from this file. Until
// then the spike's placeholder stands in so the mechanism runs end to end: recovered when
// BPM falls to 65% of the session peak, floored at 110 bpm. Known weakness: a session
// whose peak never clears ~170 is "recovered" at any BPM ≤ 110, so early in a workout the
// ring may go green on the first sample. The gate only colors the ring and arms Continue
// (handoff brief §01: the HR gate never advances the loop by itself), so a wrong rule
// costs a color, never a set.

export const RECOVERED_FLOOR_BPM = 110;
export const RECOVERED_FRACTION_OF_PEAK = 0.65;
/** Within this many bpm above the threshold the ring turns yellow ("approaching"). */
export const APPROACHING_BAND_BPM = 10;

export function recoveredThreshold(peakBpm: number): number {
  return Math.max(RECOVERED_FLOOR_BPM, peakBpm * RECOVERED_FRACTION_OF_PEAK);
}

export function isRecovered(bpm: number, peakBpm: number): boolean {
  return bpm <= recoveredThreshold(peakBpm);
}

export type HrZone = 'resting' | 'approaching' | 'ready';

/** The ring color from a fresh reading (the timer frames 25:292 / 10:10447 / 25:257). */
export function hrZone(bpm: number, peakBpm: number): HrZone {
  const threshold = recoveredThreshold(peakBpm);
  if (bpm <= threshold) return 'ready';
  if (bpm <= threshold + APPROACHING_BAND_BPM) return 'approaching';
  return 'resting';
}
