import { getDb } from './database';

// The stored ExerciseProgress (data-model §2): the weight Log a Set pre-fills next
// session and the failure streak the plateau prompt watches.

export type StoredProgress = {
  currentWeight: number;
  consecutiveFailures: number;
  lastOutcome: 'hit' | 'failed' | null;
};

export function loadAllProgress(): Record<string, StoredProgress> {
  const rows = getDb().getAllSync<{
    exercise_id: string;
    current_weight: number;
    consecutive_failures: number;
    last_outcome: string | null;
  }>(
    'SELECT exercise_id, current_weight, consecutive_failures, last_outcome FROM exercise_progress',
  );
  const out: Record<string, StoredProgress> = {};
  for (const r of rows) {
    out[r.exercise_id] = {
      currentWeight: r.current_weight,
      consecutiveFailures: r.consecutive_failures,
      lastOutcome: (r.last_outcome as StoredProgress['lastOutcome']) ?? null,
    };
  }
  return out;
}

export function saveProgress(exerciseId: string, progress: StoredProgress, now: number) {
  getDb().runSync(
    `INSERT INTO exercise_progress (exercise_id, current_weight, consecutive_failures, last_outcome, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(exercise_id) DO UPDATE SET
       current_weight = excluded.current_weight,
       consecutive_failures = excluded.consecutive_failures,
       last_outcome = excluded.last_outcome,
       updated_at = excluded.updated_at`,
    [exerciseId, progress.currentWeight, progress.consecutiveFailures, progress.lastOutcome, now],
  );
}
