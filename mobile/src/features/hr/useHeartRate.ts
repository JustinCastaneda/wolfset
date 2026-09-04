import { useEffect, useState } from 'react';

import { WolfsetHr, type HrSample } from '@modules/wolfset-hr';
import {
  EMPTY_STREAM,
  STALE_AFTER_MS,
  currentBpm,
  ingest,
  isStale,
  meanBpm,
  type HrStreamState,
} from './hr-stream';
import { hrZone, isRecovered, type HrZone } from './recovered';

// The live heart rate for a session: subscribes to the native module for the whole
// workout (the peak happens mid-set, not mid-rest), keeps the stream rules pure, and ticks
// once a second so a quiet pipe turns into "unknown" on time. Without the module (iOS,
// tests, a build without the watch pipeline) it reports no signal and nothing else changes.
// The verdict comes from the recovered rule (recovered.ts) on the fresh reading alone.

export type HeartRate = {
  /** Fresh reading, or null when there is no signal or it went stale. */
  bpm: number | null;
  /** True once a signal existed and then went quiet — "watch signal lost". */
  lost: boolean;
  peak: number;
  /** Average of every reading this session; null before the first. */
  mean: number | null;
  /** The recovered rule's verdict; null while there is no fresh reading. */
  recovered: boolean | null;
  zone: HrZone | null;
  available: boolean;
};

export function useHeartRate(): HeartRate {
  const [stream, setStream] = useState<HrStreamState>(EMPTY_STREAM);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const native = WolfsetHr;
    if (!native) return;
    // Catch up on a sample that landed before React was listening — only if it is still
    // fresh, so yesterday's last beat never reads as "signal lost" today.
    const seed = setTimeout(() => {
      const latest = native.getLatestSample();
      const t = Date.now();
      setNow(t);
      if (latest && t - latest.phoneRecvMs <= STALE_AFTER_MS) {
        setStream((s) => ingest(s, latest, latest.phoneRecvMs));
      }
    }, 0);
    const sub = native.addListener('onHrSample', (sample: HrSample) => {
      const t = Date.now();
      setNow(t);
      setStream((s) => ingest(s, sample, t));
    });
    const tick = setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      clearTimeout(seed);
      sub.remove();
      clearInterval(tick);
    };
  }, []);

  const bpm = now === 0 ? null : currentBpm(stream, now);
  return {
    bpm,
    lost: stream.received > 0 && now !== 0 && isStale(stream, now),
    peak: stream.peak,
    mean: meanBpm(stream),
    recovered: bpm === null ? null : isRecovered(bpm),
    zone: bpm === null ? null : hrZone(bpm),
    available: WolfsetHr !== null,
  };
}
