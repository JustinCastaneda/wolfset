import { getDb } from './database';

// The stored ExerciseProgress (data-model §2): the weight Log a Set pre-fills next
// session and the failure streak the plateau prompt watches.

export type StoredProgress = {
  currentWeight: number;
  consecutiveFailures: number;
  lastOutcome: 'hit' | 'failed' | null;
  /** By-feel lifts: the moving rep target; null for steady lifts. */
  currentReps: number | null;
  /** By-feel lifts: the previous session's poke and held-at-top flag (the engine
   *  only ever reads one session back). */
  lastReserve: '0' | '1' | '2' | '3' | '4plus' | null;
  lastForm: 'clean' | 'bad' | null;
  heldAtTop: boolean;
};

export function loadAllProgress(): Record<string, StoredProgress> {
  const rows = getDb().getAllSync<{
    exercise_id: string;
    current_weight: number;
    consecutive_failures: number;
    last_outcome: string | null;
    current_reps: number | null;
    last_reserve: string | null;
    last_form: string | null;
    held_at_top: number;
  }>(
    'SELECT exercise_id, current_weight, consecutive_failures, last_outcome, current_reps, last_reserve, last_form, held_at_top FROM exercise_progress',
  );
  const out: Record<string, StoredProgress> = {};
  for (const r of rows) {
    out[r.exercise_id] = {
      currentWeight: r.current_weight,
      consecutiveFailures: r.consecutive_failures,
      lastOutcome: (r.last_outcome as StoredProgress['lastOutcome']) ?? null,
      currentReps: r.current_reps,
      lastReserve: (r.last_reserve as StoredProgress['lastReserve']) ?? null,
      lastForm: (r.last_form as StoredProgress['lastForm']) ?? null,
      heldAtTop: r.held_at_top === 1,
    };
  }
  return out;
}

export function saveProgress(exerciseId: string, progress: StoredProgress, now: number) {
  getDb().runSync(
    `INSERT INTO exercise_progress (exercise_id, current_weight, consecutive_failures, last_outcome, current_reps, last_reserve, last_form, held_at_top, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(exercise_id) DO UPDATE SET
       current_weight = excluded.current_weight,
       consecutive_failures = excluded.consecutive_failures,
       last_outcome = excluded.last_outcome,
       current_reps = excluded.current_reps,
       last_reserve = excluded.last_reserve,
       last_form = excluded.last_form,
       held_at_top = excluded.held_at_top,
       updated_at = excluded.updated_at`,
    [
      exerciseId,
      progress.currentWeight,
      progress.consecutiveFailures,
      progress.lastOutcome,
      progress.currentReps,
      progress.lastReserve,
      progress.lastForm,
      progress.heldAtTop ? 1 : 0,
      now,
    ],
  );
}
