import type { SessionEvent } from './types';

// A forgotten workout (Justin, 2026-09-05: he sometimes forgets to end a Fitbit workout
// and it counts the drive home — "I would prefer it bugged me about it"). Lifting is
// mostly stillness, so motion says nothing; the only honest signal is time since the
// last thing the lifter did. Twenty minutes of nothing — four times a long rest — asks
// "Still lifting?" on the wrist and the phone; ten more minutes ends the workout as it
// stands, at the last thing they did, so the time after it never counts. Three hours is
// the ceiling either way, matching the watch stream's own backstop. Never motion-based:
// Galaxy Watch's "Seems like you've stopped" fires mid-rest and is the anti-pattern.

export const IDLE_PROMPT_MS = 20 * 60_000;
export const IDLE_END_MS = 30 * 60_000;
export const MAX_WORKOUT_MS = 3 * 60 * 60_000;

export type IdleVerdict = 'active' | 'prompt' | 'end';

/** When the workout ends by itself unless something happens first. */
export function idleEndsAt(lastActivityAt: number, startedAt: number): number {
  return Math.min(lastActivityAt + IDLE_END_MS, startedAt + MAX_WORKOUT_MS);
}

export function idleVerdict(lastActivityAt: number, startedAt: number, now: number): IdleVerdict {
  if (now >= idleEndsAt(lastActivityAt, startedAt)) return 'end';
  return now >= lastActivityAt + IDLE_PROMPT_MS ? 'prompt' : 'active';
}

/** The next moment the verdict can change; null once it is "end". */
export function nextIdleCheckAt(
  lastActivityAt: number,
  startedAt: number,
  now: number,
): number | null {
  const end = idleEndsAt(lastActivityAt, startedAt);
  if (now >= end) return null;
  const prompt = lastActivityAt + IDLE_PROMPT_MS;
  return now < prompt && prompt < end ? prompt : end;
}

/** Only the lifter counts as activity: a rest running out on its own and the heart-rate
 *  gate's verdict happen without them. */
export function isLifterActivity(event: SessionEvent): boolean {
  if (event.type === 'recoveredChanged') return false;
  if (event.type === 'restEnded') return event.reason === 'continue';
  return true;
}
