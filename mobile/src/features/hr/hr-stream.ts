import type { HrSample } from '@modules/wolfset-hr';

// The heart-rate stream as the app sees it, with the three rules the spike measured
// (docs/spike-findings.md, "pipe requirements"): drop out-of-order samples, treat a quiet
// pipe as *unknown* rather than "last seen", and expect bursts. Pure — tested.

/** No fresh sample for ~3× the watch's 1.92 s cadence → the reading is unknown. */
export const STALE_AFTER_MS = 6_000;

export type HrStreamState = {
  /** The latest accepted reading, or null before the first / after a reset. */
  bpm: number | null;
  /** When that reading arrived (phone clock). */
  at: number | null;
  /** Highest seq accepted; anything at or below it is old news. */
  maxSeq: number;
  /** Session peak — what the placeholder recovered rule measures against. */
  peak: number;
  received: number;
};

export const EMPTY_STREAM: HrStreamState = {
  bpm: null,
  at: null,
  maxSeq: -1,
  peak: 0,
  received: 0,
};

/** Accept a sample: out-of-order (seq ≤ max seen) is ignored — a stale low BPM arriving
 *  after a fresh high one would unlock the gate early, the unsafe direction. */
export function ingest(state: HrStreamState, sample: HrSample, now: number): HrStreamState {
  if (sample.seq <= state.maxSeq) return state;
  if (!Number.isFinite(sample.bpm) || sample.bpm <= 0) return { ...state, maxSeq: sample.seq };
  return {
    bpm: sample.bpm,
    at: now,
    maxSeq: sample.seq,
    peak: Math.max(state.peak, sample.bpm),
    received: state.received + 1,
  };
}

/** True when the reading is too old to trust. */
export function isStale(state: HrStreamState, now: number, staleAfterMs = STALE_AFTER_MS): boolean {
  return state.at === null || now - state.at > staleAfterMs;
}

/** What the screen may show: the number while fresh, null when unknown. */
export function currentBpm(state: HrStreamState, now: number): number | null {
  return isStale(state, now) ? null : state.bpm;
}
