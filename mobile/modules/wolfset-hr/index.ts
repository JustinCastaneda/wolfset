import { requireOptionalNativeModule, type NativeModule } from 'expo-modules-core';

// The JS face of the native seam (CLAUDE.md: one Kotlin module on the phone). Today it
// carries heart-rate samples and taps from the watch, the session's start/stop of the
// watch's stream, the session's view for the watch screen, and the workout's foreground
// service — which keeps the session running off screen and is the doze-proof rest timer.
// Optional because it only exists on Android with the watch pipeline compiled in — on
// iOS, in tests, or in a build without it, `WolfsetHr` is null and the app runs without
// a signal.

/** One sample as the watch sent it (docs/hr-protocol.md), stamped on arrival. */
export type HrSample = {
  /** Monotonic per watch stream; the JS layer drops anything ≤ the max already seen. */
  seq: number;
  bpm: number;
  /** Health Services accuracy: ACCURACY_HIGH / _MEDIUM / _LOW / UNKNOWN. */
  acc: string;
  watchWallMs: number;
  phoneRecvMs: number;
  /** 1 = the watch was in ambient (blurred) mode; 0 = interactive; -1 = unknown. */
  amb: number;
  /** 1 = the 5-second batching override is active on the watch; 0 = not; -1 = unknown. */
  bm: number;
};

/** The native rest timer ran out. `endsAt` names the rest it belonged to, so a late
 *  event for an earlier rest can never end the current one. */
export type RestEnded = { at: number; endsAt: number };

/** A tap on the watch, as it arrives (docs/hr-protocol.md): `logSet` carries the reps,
 *  `changeDay` the plan day's order; the rest carry nothing (0 and -1). The session turns
 *  it into a machine event. */
export type WatchAction = { type: string; reps: number; day: number };

type WolfsetHrEvents = {
  onHrSample: (sample: HrSample) => void;
  onRestEnded: (event: RestEnded) => void;
  onWatchAction: (action: WatchAction) => void;
};

declare class WolfsetHrNativeModule extends NativeModule<WolfsetHrEvents> {
  /** The most recent sample, in case it arrived before JS was listening. */
  getLatestSample(): HrSample | null;
  /** Dev only: push a sample through the same path the watch uses. */
  debugInjectSample(bpm: number): void;
  /** Tell every connected watch to start streaming. Resolves with how many were reached
   *  (0 = no watch connected); rejects when the phone has no Wearable support at all. */
  startWatchStream(): Promise<number>;
  /** Tell every connected watch to stop. Same result shape as start. */
  stopWatchStream(): Promise<number>;
  /** Show the session on the watch: its view as JSON (features/set-loop/watch-view.ts),
   *  published as a Data Layer item so a watch that wakes late still reads the latest. */
  publishWatchView(viewJson: string): void;
  /** Whether the rest timer's foreground service may run (sensor + notification
   *  permissions on Android 13/14+). */
  hasRestPermissions(): boolean;
  /** Ask for them; resolves true when all granted. */
  requestRestPermissions(): Promise<boolean>;
  /** Hold the workout's foreground service — "Workout in progress · <title>" in the
   *  shade — so the session keeps running with the app off screen or the phone in a
   *  pocket. Idempotent; a second call renames the notification. */
  startWorkout(title: string): void;
  /** Release it — the session closed. */
  endWorkout(): void;
  /** Arm the doze-proof rest timer: wake lock, countdown notification, buzz and ding at
   *  `endsAtMs` — the only alert; recovering early is shown, never announced. */
  startRest(endsAtMs: number): void;
  /** Disarm it — the rest ended (timer, Continue, workout over, skipped). */
  endRest(): void;
}

export const WolfsetHr = requireOptionalNativeModule<WolfsetHrNativeModule>('WolfsetHr');
