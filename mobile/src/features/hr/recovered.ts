// The "recovered" rule — Phase 0 exit criterion B, decided by Justin on 2026-09-02 after
// the first hardware run: absolute heart-rate bands, the way Fitbit zones read.
//
//   green   < 120 bpm   recovered — "a vigorous walk; by then you've recovered"
//   yellow  120–140     approaching
//   red     > 140       still working
//
// Peaks land around 165 for most people and all of this shifts with age, so these are
// defaults for a future setting (Profile), and later the app may learn them from when
// the user actually taps Continue. Nothing here advances the loop by itself: the rule
// colors the ring and arms Continue (handoff brief §01).

export type HrThresholds = {
  /** Below this the lifter is recovered. */
  recoveredBelowBpm: number;
  /** At or below this the lifter is close; above it, still working. */
  approachingUpToBpm: number;
};

export const DEFAULT_THRESHOLDS: HrThresholds = {
  recoveredBelowBpm: 120,
  approachingUpToBpm: 140,
};

export type HrZone = 'resting' | 'approaching' | 'ready';

export function isRecovered(bpm: number, t: HrThresholds = DEFAULT_THRESHOLDS): boolean {
  return bpm < t.recoveredBelowBpm;
}

/** The ring color from a fresh reading (timer frames 25:292 red · 10:10447 yellow ·
 *  25:257 green). */
export function hrZone(bpm: number, t: HrThresholds = DEFAULT_THRESHOLDS): HrZone {
  if (bpm < t.recoveredBelowBpm) return 'ready';
  if (bpm <= t.approachingUpToBpm) return 'approaching';
  return 'resting';
}
