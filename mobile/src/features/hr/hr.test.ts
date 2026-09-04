import { describe, expect, it } from '@jest/globals';
import type { HrSample } from '@modules/wolfset-hr';
import { EMPTY_STREAM, currentBpm, ingest, isStale, meanBpm } from './hr-stream';
import { DEFAULT_THRESHOLDS, hrZone, isRecovered } from './recovered';

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

  it('keeps the session average for Session Done; unknown before the first reading', () => {
    expect(meanBpm(EMPTY_STREAM)).toBeNull();
    let s = ingest(EMPTY_STREAM, sample(1, 90), 1_000);
    s = ingest(s, sample(2, 140), 2_000);
    s = ingest(s, sample(1, 200), 2_100); // out of order: not counted
    s = ingest(s, sample(3, 0), 2_200); // garbage: not counted
    expect(meanBpm(s)).toBe(115);
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

describe('the recovered rule (Justin, 2026-09-02): green < 120 · yellow to 140 · red above', () => {
  it('recovered strictly below 120', () => {
    expect(isRecovered(119)).toBe(true);
    expect(isRecovered(120)).toBe(false);
  });

  it('zones: ready below 120, approaching through 140, resting above', () => {
    expect(hrZone(53)).toBe('ready');
    expect(hrZone(119)).toBe('ready');
    expect(hrZone(120)).toBe('approaching');
    expect(hrZone(140)).toBe('approaching');
    expect(hrZone(141)).toBe('resting');
    expect(hrZone(165)).toBe('resting');
  });

  it('the thresholds are a value, so a setting can replace them later', () => {
    const older = { ...DEFAULT_THRESHOLDS, recoveredBelowBpm: 110, approachingUpToBpm: 130 };
    expect(hrZone(115, older)).toBe('approaching');
    expect(isRecovered(115, older)).toBe(false);
  });
});
