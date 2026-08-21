import type { HrSampleEvent, Metrics } from '../modules/spike-hr';

// JS-side measurement of the pipe. Exit criteria A live here:
//  - beat-to-render latency, end to end (watch clock corrected by the ping/pong offset)
//  - dropped events (native log vs what JS actually saw, plus seq gaps)
//  - sample rate, battery cost

export type LatencyBreakdown = {
  e2eMs: number; // watch beat timestamp → React commit
  watchToPhoneMs: number; // watch beat → native listener
  nativeToJsMs: number; // bridge send → JS event handler
  jsToRenderMs: number; // JS event → React commit
};

export type SessionStats = {
  startedAtMs: number | null;
  jsSamplesSeen: number;
  droppedSeqGaps: number; // gaps in seq as seen by JS
  lastSeq: number;
  e2e: Percentiles;
  watchToPhone: Percentiles;
  nativeToJs: Percentiles;
  watchBatteryFirst: number | null;
  watchBatteryLast: number | null;
  phoneBatteryFirst: number | null;
};

export type Percentiles = { avg: number; p50: number; p95: number; max: number; n: number };

const emptyPercentiles: Percentiles = { avg: 0, p50: 0, p95: 0, max: 0, n: 0 };

function percentiles(values: number[]): Percentiles {
  if (values.length === 0) return emptyPercentiles;
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  return {
    avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
    p50: at(0.5),
    p95: at(0.95),
    max: sorted[sorted.length - 1],
    n: values.length,
  };
}

export class MetricsCollector {
  private e2e: number[] = [];
  private watchToPhone: number[] = [];
  private nativeToJs: number[] = [];
  private jsLog: Array<HrSampleEvent & LatencyBreakdown & { jsRecvMs: number; renderMs: number }> =
    [];
  // Set, not a running gap counter: the transport delivers out of order (2 observed in
  // session 1), and a late-but-delivered sample must un-count the gap it briefly left.
  private seenSeqs = new Set<number>();
  private minSeq = 0;

  startedAtMs: number | null = null;
  jsSamplesSeen = 0;
  lastSeq = 0;
  watchBatteryFirst: number | null = null;
  watchBatteryLast: number | null = null;
  phoneBatteryFirst: number | null = null;

  start(phoneBattery: number) {
    this.e2e = [];
    this.watchToPhone = [];
    this.nativeToJs = [];
    this.jsLog = [];
    this.seenSeqs = new Set();
    this.minSeq = 0;
    this.startedAtMs = Date.now();
    this.jsSamplesSeen = 0;
    this.lastSeq = 0;
    this.watchBatteryFirst = null;
    this.watchBatteryLast = null;
    this.phoneBatteryFirst = phoneBattery;
  }

  // Called from the post-commit effect so renderMs is a real paint-adjacent timestamp.
  record(sample: HrSampleEvent, jsRecvMs: number, renderMs: number): LatencyBreakdown {
    // clockOffsetMs = watchClock - phoneClock → beat time on the phone's clock:
    const beatPhoneMs = sample.watchWallMs - sample.clockOffsetMs;
    const breakdown: LatencyBreakdown = {
      e2eMs: renderMs - beatPhoneMs,
      watchToPhoneMs: sample.phoneRecvMs - beatPhoneMs,
      nativeToJsMs: jsRecvMs - sample.bridgeSendMs,
      jsToRenderMs: renderMs - jsRecvMs,
    };

    this.jsSamplesSeen += 1;
    this.seenSeqs.add(sample.seq);
    if (this.minSeq === 0 || sample.seq < this.minSeq) this.minSeq = sample.seq;
    this.lastSeq = Math.max(this.lastSeq, sample.seq);
    if (this.watchBatteryFirst === null && sample.watchBattery >= 0) {
      this.watchBatteryFirst = sample.watchBattery;
    }
    if (sample.watchBattery >= 0) this.watchBatteryLast = sample.watchBattery;

    this.e2e.push(breakdown.e2eMs);
    this.watchToPhone.push(breakdown.watchToPhoneMs);
    this.nativeToJs.push(breakdown.nativeToJsMs);
    if (this.jsLog.length < 100_000) {
      this.jsLog.push({ ...sample, ...breakdown, jsRecvMs, renderMs });
    }
    return breakdown;
  }

  stats(): SessionStats {
    const droppedSeqGaps =
      this.seenSeqs.size === 0 ? 0 : this.lastSeq - this.minSeq + 1 - this.seenSeqs.size;
    return {
      startedAtMs: this.startedAtMs,
      jsSamplesSeen: this.jsSamplesSeen,
      droppedSeqGaps,
      lastSeq: this.lastSeq,
      e2e: percentiles(this.e2e),
      watchToPhone: percentiles(this.watchToPhone),
      nativeToJs: percentiles(this.nativeToJs),
      watchBatteryFirst: this.watchBatteryFirst,
      watchBatteryLast: this.watchBatteryLast,
      phoneBatteryFirst: this.phoneBatteryFirst,
    };
  }

  exportJson(nativeMetrics: Metrics, nativeLogJson: string): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        stats: this.stats(),
        nativeMetrics,
        // Native log is ground truth; jsLog is what survived the bridge. Diff = bridge drops.
        nativeLog: JSON.parse(nativeLogJson),
        jsLog: this.jsLog,
      },
      null,
      2,
    );
  }
}
