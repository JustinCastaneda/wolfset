import { loadActivePlan } from '@/lib/db/plan-store';
import { loadAllProgress, saveProgress } from '@/lib/db/progress-store';
import { finalizeSession, loadSnapshot } from '@/lib/db/session-store';
import { reduce } from './machine';
import { settleSession, type SettledExercise } from './settle-session';
import type { SessionState } from './types';

// How a session becomes history. The session screen does it when Finish is tapped; the
// Day Overview does it to a workout left under way when the user starts another day
// (Justin, 2026-09-04: never box the user into a dead end — warn, then let them). Both
// paths store the same things, so they share this one.

/** The session ended right now, from wherever it stands: any poke grid still waiting is
 *  skipped (a skip repeats progression), then the workout ends — early, if prescribed
 *  work is left, so the unfinished lifts score as failures (data-model §5.1). Pure. */
export function endSessionNow(state: SessionState, at: number): SessionState {
  const answered = state.pendingRatings.reduce(
    (s, exerciseIndex) => reduce(s, { type: 'feelRated', exerciseIndex, rating: null }),
    state,
  );
  return reduce(answered, { type: 'workoutEnded', at });
}

/** A finished session becomes what it leaves behind: each lift scored and its next
 *  weight stored, the workout written to history under the plan day it ran, the
 *  snapshot gone. Returns the settlement for Session Done to show. */
export function storeFinishedSession(
  state: SessionState,
  startedAt: number,
  now: number,
  dayId: string,
): SettledExercise[] {
  const settled = settleSession(state, loadAllProgress());
  for (const lift of settled) saveProgress(lift.exerciseId, lift.progress, now);
  finalizeSession(state, startedAt, now, dayId);
  return settled;
}

/** The workout left under way is over: ended as it stands and stored, so another day
 *  can start. The plateau question Session Done would have asked goes unasked — the
 *  weight holds, as when that screen is left unanswered. Nothing to do without one. */
export function abandonSavedSession(now: number) {
  const saved = loadSnapshot();
  if (!saved || saved.state.phase.name === 'done') return;
  // A workout under way keeps its day as the rotation's next (the hub's rule), so that
  // is the day this one ran under.
  const day = loadActivePlan()?.days.find((d) => d.isNext);
  if (!day) return;
  storeFinishedSession(endSessionNow(saved.state, now), saved.startedAt, now, day.dayId);
}
