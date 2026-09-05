import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import { STARTER_EXERCISES } from './seed-exercises';
import { STARTER_PLAN } from './seed-plan';

// The local database — the source of truth (decision #1: local-first; Supabase syncs
// later, Phase 6). Schema follows docs/data-model.md: the session loop's tables, the
// per-exercise progress, (v4) the plan tables the builder edits, (v5) the exercise
// catalog, (v6) day rotation, (v7) the profile row Settings edits.
//
// Migrations: PRAGMA user_version, additive only. Bump VERSION, append a block.

const VERSION = 8;

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
    if (from < 2) {
      database.execSync(`
        -- The live numbers per exercise (data-model ExerciseProgress): what Log a Set
        -- pre-fills next session, and the failure streak behind the plateau prompt.
        CREATE TABLE exercise_progress (
          exercise_id TEXT PRIMARY KEY,
          current_weight REAL NOT NULL,
          consecutive_failures INTEGER NOT NULL DEFAULT 0,
          last_outcome TEXT,
          updated_at INTEGER NOT NULL
        );
      `);
    }
    if (from < 3) {
      database.execSync(`
        -- By-feel bookkeeping (engine 384:11049 reads only the previous session):
        -- the moving rep target, the last poke, and whether the lift held at the
        -- top of its range.
        ALTER TABLE exercise_progress ADD COLUMN current_reps INTEGER;
        ALTER TABLE exercise_progress ADD COLUMN last_reserve TEXT;
        ALTER TABLE exercise_progress ADD COLUMN last_form TEXT;
        ALTER TABLE exercise_progress ADD COLUMN held_at_top INTEGER NOT NULL DEFAULT 0;
      `);
    }
    if (from < 4) {
      database.execSync(`
        -- The plan template (data-model §2 Plan → PlanDay → PlanExercise). Per-exercise
        -- columns that are NULL inherit the plan default. One plan is active at a time.
        CREATE TABLE plans (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          source TEXT NOT NULL DEFAULT 'built',
          progression_default TEXT NOT NULL DEFAULT 'steady',
          is_active INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE plan_days (
          id TEXT PRIMARY KEY,
          plan_id TEXT NOT NULL REFERENCES plans(id),
          day_order INTEGER NOT NULL,
          name TEXT NOT NULL
        );
        CREATE INDEX idx_plan_days_plan ON plan_days(plan_id);
        CREATE TABLE plan_exercises (
          id TEXT PRIMARY KEY,
          plan_day_id TEXT NOT NULL REFERENCES plan_days(id),
          exercise_id TEXT NOT NULL,
          exercise_order INTEGER NOT NULL,
          name TEXT NOT NULL,
          sets INTEGER NOT NULL,
          reps INTEGER NOT NULL,
          start_weight REAL NOT NULL,
          unit TEXT NOT NULL DEFAULT 'lb',
          rest_seconds INTEGER NOT NULL DEFAULT 90,
          auto_start_timer INTEGER NOT NULL DEFAULT 1,
          strategy TEXT
        );
        CREATE INDEX idx_plan_exercises_day ON plan_exercises(plan_day_id);
      `);
      seedStarterPlan(database, Date.now());
    }
    if (from < 5) {
      database.execSync(`
        -- The exercise catalog (data-model §2 Exercise): what Search Exercise lists.
        -- muscle_groups is comma-joined; sort_order keeps the seeded order on screen.
        CREATE TABLE exercises (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          load_type TEXT NOT NULL,
          muscle_groups TEXT NOT NULL DEFAULT '',
          is_unilateral INTEGER NOT NULL DEFAULT 0,
          is_custom INTEGER NOT NULL DEFAULT 0,
          sort_order INTEGER NOT NULL DEFAULT 0
        );
        -- Reps First: "Max Reps before Weight Increase" (NULL = plan default, 20).
        ALTER TABLE plan_exercises ADD COLUMN rep_ceiling INTEGER;
      `);
      STARTER_EXERCISES.forEach((ex, i) => {
        database.runSync(
          `INSERT INTO exercises (id, name, description, load_type, muscle_groups, is_unilateral, is_custom, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
          [
            ex.id,
            ex.name,
            ex.description,
            ex.loadType,
            ex.muscles.join(','),
            ex.unilateral ? 1 : 0,
            i,
          ],
        );
      });
    }
    if (from < 6) {
      database.execSync(`
        -- Multi-day plans: which day Start Workout runs next (rotates on finish), and
        -- which plan day a finished workout came from (data-model §2 Workout.planDayId).
        ALTER TABLE plans ADD COLUMN next_day_order INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE workouts ADD COLUMN plan_day_id TEXT;
      `);
    }
    if (from < 7) {
      database.execSync(`
        -- The profile (data-model §2): one row, created here so Settings always has
        -- something to edit. Bodyweight in pounds, height in centimetres, whatever the
        -- unit — lib/units converts for display. Equipment is the checklist's ids, joined.
        CREATE TABLE profile (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          unit TEXT NOT NULL DEFAULT 'lb',
          smallest_step_dumbbell REAL NOT NULL DEFAULT 5,
          equipment TEXT NOT NULL DEFAULT '',
          experience TEXT,
          goal TEXT,
          bodyweight REAL,
          height_cm REAL
        );
        INSERT INTO profile (id) VALUES (1);
      `);
    }
    if (from < 8) {
      database.execSync(`
        -- The highest watch tap id the live session has taken (session-controller.ts):
        -- the watch keeps its taps until the phone acks them, so a session resumed after
        -- a kill must still know which ones it already applied — never log a set twice.
        ALTER TABLE session_snapshot ADD COLUMN watch_tap_ack INTEGER NOT NULL DEFAULT 0;
      `);
    }
    database.execSync(`PRAGMA user_version = ${VERSION}`);
  });
}

/** The starter plan (seed-plan.ts) becomes the active plan, so an app with no plan of
 *  its own still starts a workout — the demo day, now as rows the builder can edit. */
function seedStarterPlan(database: SQLiteDatabase, now: number) {
  database.runSync(
    `INSERT INTO plans (id, name, source, progression_default, is_active, created_at, updated_at)
     VALUES (?, ?, 'preset', 'steady', 1, ?, ?)`,
    [STARTER_PLAN.id, STARTER_PLAN.name, now, now],
  );
  STARTER_PLAN.days.forEach((day, dayOrder) => {
    database.runSync('INSERT INTO plan_days (id, plan_id, day_order, name) VALUES (?, ?, ?, ?)', [
      day.id,
      STARTER_PLAN.id,
      dayOrder,
      day.name,
    ]);
    day.exercises.forEach((ex, order) => {
      database.runSync(
        `INSERT INTO plan_exercises (id, plan_day_id, exercise_id, exercise_order, name, sets, reps, start_weight, rest_seconds, auto_start_timer, strategy)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `${day.id}-${ex.exerciseId}`,
          day.id,
          ex.exerciseId,
          order,
          ex.name,
          ex.sets,
          ex.reps,
          ex.startWeight,
          ex.restSeconds,
          ex.autoStartTimer ? 1 : 0,
          ex.strategy,
        ],
      );
    });
  });
}

/** Test seam: reset the singleton (jest has no native sqlite). */
export function setDbForTesting(fake: SQLiteDatabase | null) {
  db = fake;
}
