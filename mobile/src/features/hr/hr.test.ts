import { describe, expect, it } from '@jest/globals';
import type { HrSample } from '../../../modules/wolfset-hr';
import { EMPTY_STREAM, currentBpm, ingest, isStale } from './hr-stream';
import { hrZone, isRecovered, recoveredThreshold } from './recovered';

const sample = (seq: number, bpm: number): HrSample => ({
  seq,
  bpm,
  acc: 'ACCURACY_HIGH',
  watchWallMs: 0,
  phoneRecvMs: 0,
  amb: 0,
  bm: 1,
});

describe('the heart-rate stream (spike pipe requirements)', () => {
  it('accepts samples in order and tracks the session peak', () => {
    let s = ingest(EMPTY_STREAM, sample(1, 90), 1_000);
    s = ingest(s, sample(2, 140), 2_000);
    s = ingest(s, sample(3, 120), 3_000);
    expect(s.bpm).toBe(120);
    expect(s.peak).toBe(140);
    expect(s.received).toBe(3);
  });

  it('drops an out-of-order sample — a stale low reading must not unlock the gate', () => {
    let s = ingest(EMPTY_STREAM, sample(5, 150), 1_000);
    s = ingest(s, sample(3, 80), 1_100);
    expect(s.bpm).toBe(150);
    expect(s.received).toBe(1);
  });

  it('a quiet pipe turns the reading unknown after 6 s, not "last seen"', () => {
    const s = ingest(EMPTY_STREAM, sample(1, 100), 10_000);
    expect(currentBpm(s, 15_000)).toBe(100);
    expect(isStale(s, 16_001)).toBe(true);
    expect(currentBpm(s, 16_001)).toBeNull();
  });

  it('ignores a zero/garbage bpm but still advances seq', () => {
    const s = ingest(EMPTY_STREAM, sample(1, 0), 1_000);
    expect(s.bpm).toBeNull();
    expect(s.maxSeq).toBe(1);
  });
});

describe('the placeholder recovered rule (⚠️ not the product rule)', () => {
  it('threshold is 65% of peak, never below 110', () => {
    expect(recoveredThreshold(180)).toBe(117);
    expect(recoveredThreshold(140)).toBe(110);
  });

  it('recovered at or below the threshold', () => {
    expect(isRecovered(117, 180)).toBe(true);
    expect(isRecovered(118, 180)).toBe(false);
  });

  it('zones: ready at the threshold, approaching within 10 above, resting beyond', () => {
    expect(hrZone(117, 180)).toBe('ready');
    expect(hrZone(125, 180)).toBe('approaching');
    expect(hrZone(128, 180)).toBe('resting');
  });
});
