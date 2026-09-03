import { WolfsetHr, type RestEnded } from '@modules/wolfset-hr';
import { DEFAULT_THRESHOLDS } from '@/features/hr/recovered';
import type { Phase } from './types';

// The doze-proof rest timer's JS face. The machine keeps the truth (absolute timestamps),
// so when the screen is on nothing here is needed; when the phone is in a pocket Android
// throttles JS and the native service (RestTimerService) holds the rest instead: countdown
// in the shade, a buzz at the end, a buzz when the watch says recovered. Its "rest over"
// comes back as an event and the machine advances there — native never moves the loop.
// Without the module (iOS, tests) or without permissions, the on-screen timer alone runs.

/** Pure: when a rest ends, in wall-clock ms; null outside a rest. */
export function restEndsAt(phase: Phase): number | null {
  if (phase.name !== 'resting') return null;
  return phase.startedAt + phase.restSeconds * 1000;
}

/** Pure: a native "rest over" belongs to the current rest only when its end matches. */
export function restEndedMatches(event: RestEnded, endsAt: number | null): boolean {
  return endsAt !== null && event.endsAt === endsAt;
}

/** Ask once per session; true when the native timer may run. Never throws. */
export async function ensureRestPermissions(): Promise<boolean> {
  const native = WolfsetHr;
  if (!native) return false;
  try {
    if (native.hasRestPermissions()) return true;
    return await native.requestRestPermissions();
  } catch {
    return false;
  }
}

export function armRestTimer(endsAtMs: number) {
  WolfsetHr?.startRest(endsAtMs, DEFAULT_THRESHOLDS.recoveredBelowBpm);
}

export function disarmRestTimer() {
  WolfsetHr?.endRest();
}

/** Subscribe to the native "rest over"; returns the unsubscribe. No module: no-op. */
export function onNativeRestEnded(handler: (event: RestEnded) => void): () => void {
  const native = WolfsetHr;
  if (!native) return () => {};
  const sub = native.addListener('onRestEnded', handler);
  return () => sub.remove();
}
