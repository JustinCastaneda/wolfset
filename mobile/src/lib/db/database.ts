import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

// The local database — the source of truth (decision #1: local-first; Supabase syncs
// later, Phase 6). Schema follows docs/data-model.md; only the tables the session loop
// needs exist yet — plan tables arrive with the plan builder.
//
// Migrations: PRAGMA user_version, additive only. Bump VERSION, append a block.

const VERSION = 1;

let db: SQLiteDatabase | null = null;

export function getDb(): SQLiteDatabase {
  if (!db) {
    db = openDatabaseSync('wolfset.db');
    migrate(db);
  }
  return db;
}

function migrate(database: SQLiteDatabase) {
  const row = database.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  const from = row?.user_version ?? 0;
  if (from >= VERSION) return;

  database.withTransactionSync(() => {
    if (from < 1) {
      database.execSync(`
        -- One row: the live session's machine state, so a killed app resumes exactly
        -- where it stood (including a running rest — timestamps are absolute).
        CREATE TABLE session_snapshot (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          state TEXT NOT NULL,
          started_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        -- Finished workouts (data-model §2 Workout, session subset).
        CREATE TABLE workouts (
          id TEXT PRIMARY KEY,
          kind TEXT NOT NULL,
          status TEXT NOT NULL,
          started_at INTEGER NOT NULL,
          ended_at INTEGER NOT NULL,
          duration_sec INTEGER NOT NULL,
          total_volume REAL NOT NULL,
          set_count INTEGER NOT NULL,
          created_at INTEGER NOT NULL
        );

        -- Every logged set (data-model §2 WorkoutSet).
        CREATE TABLE workout_sets (
          id TEXT PRIMARY KEY,
          workout_id TEXT NOT NULL REFERENCES workouts(id),
          exercise_id TEXT NOT NULL,
          exercise_name TEXT NOT NULL,
          set_index INTEGER NOT NULL,
          weight REAL NOT NULL,
          unit TEXT NOT NULL DEFAULT 'lb',
          reps INTEGER NOT NULL,
          logged_at INTEGER NOT NULL,
          rest_started_at INTEGER,
          rest_ended_at INTEGER,
          rest_end_reason TEXT
        );
        CREATE INDEX idx_sets_workout ON workout_sets(workout_id);
      `);
    }
    database.execSync(`PRAGMA user_version = ${VERSION}`);
  });
}

/** Test seam: reset the singleton (jest has no native sqlite). */
export function setDbForTesting(fake: SQLiteDatabase | null) {
  db = fake;
}
