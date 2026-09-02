import { getDb } from './database';
import type { SessionState } from '@/features/set-loop/types';

// Persistence for the live session. Every machine event is followed by a snapshot
// write (a session state is a few KB — cheap, and gyms have no signal, so the write
// must always be local, decision #1). Finishing turns the snapshot into history rows.

export type SavedSession = { state: SessionState; startedAt: number };

export function loadSnapshot(): SavedSession | null {
  const row = getDb().getFirstSync<{ state: string; started_at: number }>(
    'SELECT state, started_at FROM session_snapshot WHERE id = 1',
  );
  if (!row) return null;
  try {
    return { state: migrateSnapshot(JSON.parse(row.state)), startedAt: row.started_at };
  } catch {
    // A corrupt snapshot must never block starting a workout (conventions §5) —
    // drop it and start fresh.
    clearSnapshot();
    return null;
  }
}

/** Snapshots persist across app updates, so they migrate like the schema does:
 *  fields added to SessionState get defaults here, and a snapshot that still can't
 *  stand up throws into the corrupt-drop path above. Never let an old save brick
 *  the workout screen (learned 2026-09-02: pre-By-Feel snapshots lacked the rating
 *  fields and crashed resume). */
export function migrateSnapshot(raw: unknown): SessionState {
  if (typeof raw !== 'object' || raw === null) throw new Error('snapshot is not an object');
  const state = raw as SessionState;
  if (!Array.isArray(state.exercises) || !state.phase || !Array.isArray(state.sets)) {
    throw new Error('snapshot missing core fields');
  }
  return {
    ...state,
    // Added with the By Feel grid (PR #32); older saves predate them.
    pendingRatings: Array.isArray(state.pendingRatings) ? state.pendingRatings : [],
    feelRatings:
      typeof state.feelRatings === 'object' && state.feelRatings !== null ? state.feelRatings : {},
  };
}

export function saveSnapshot(state: SessionState, startedAt: number, now: number) {
  getDb().runSync(
    `INSERT INTO session_snapshot (id, state, started_at, updated_at) VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at`,
    [JSON.stringify(state), startedAt, now],
  );
}

export function clearSnapshot() {
  getDb().runSync('DELETE FROM session_snapshot WHERE id = 1');
}

/** A finished session becomes history: one workouts row + its sets, snapshot gone. */
export function finalizeSession(state: SessionState, startedAt: number, endedAt: number) {
  const rows = workoutRows(state, startedAt, endedAt);
  const db = getDb();
  db.withTransactionSync(() => {
    db.runSync(
      `INSERT INTO workouts (id, kind, status, started_at, ended_at, duration_sec, total_volume, set_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rows.workout.id,
        rows.workout.kind,
        rows.workout.status,
        rows.workout.startedAt,
        rows.workout.endedAt,
        rows.workout.durationSec,
        rows.workout.totalVolume,
        rows.workout.setCount,
        endedAt,
      ],
    );
    for (const set of rows.sets) {
      db.runSync(
        `INSERT INTO workout_sets (id, workout_id, exercise_id, exercise_name, set_index, weight, reps, logged_at, rest_started_at, rest_ended_at, rest_end_reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          set.id,
          rows.workout.id,
          set.exerciseId,
          set.exerciseName,
          set.setIndex,
          set.weight,
          set.reps,
          set.loggedAt,
          set.restStartedAt,
          set.restEndedAt,
          set.restEndReason,
        ],
      );
    }
    db.runSync('DELETE FROM session_snapshot WHERE id = 1');
  });
}

/** Pure mapping from machine state to history rows — the testable part. */
export function workoutRows(state: SessionState, startedAt: number, endedAt: number) {
  const endedEarly = state.phase.name === 'done' && state.phase.endedEarly;
  return {
    workout: {
      id: newId(),
      kind: state.kind,
      status: endedEarly ? 'ended-early' : 'finished',
      startedAt,
      endedAt,
      durationSec: Math.max(0, Math.round((endedAt - startedAt) / 1000)),
      totalVolume: state.sets.reduce((sum, s) => sum + s.weight * s.reps, 0),
      setCount: state.sets.length,
    },
    sets: state.sets.map((s) => ({
      id: newId(),
      exerciseId: state.exercises[s.exerciseIndex].exerciseId,
      exerciseName: state.exercises[s.exerciseIndex].name,
      setIndex: s.setIndex,
      weight: s.weight,
      reps: s.reps,
      loggedAt: s.loggedAt,
      restStartedAt: s.restStartedAt,
      restEndedAt: s.restEndedAt,
      restEndReason: s.restEndReason,
    })),
  };
}

// UUIDs are generated on the phone (data-model §0) so rows sync later without renumbering.
function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
