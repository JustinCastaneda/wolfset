// The progression domain, as written in docs/data-model.md §3 and §5.
// Plain types — no React, no storage. Everything here is testable in isolation.

export type Unit = 'lb' | 'kg';

export type Strategy = 'steady' | 'reps-first' | 'by-feel';

/** How an exercise gets harder between sessions (data-model §3). */
export type ProgressionRule =
  { strategy: 'steady' } | { strategy: 'reps-first'; repStep: number } | { strategy: 'by-feel' };

/** Drop `percent` after `afterFailures` consecutive failures (decision 11b). */
export type DeloadRule = { percent: number; afterFailures: number };

/** What the plan prescribes for one exercise, with the per-exercise knobs resolved
 *  (plan defaults already applied — `null` inheritance is the caller's job). */
export type Prescription = {
  sets: number;
  reps: number;
  /** Weight jump on a hit. Default 5 lb, overridable per exercise. */
  increment: number;
  /** "Max Reps before Weight Increase". Only `reps-first` reads it. Default 20. */
  repCeiling: number;
  progression: ProgressionRule;
  deload: DeloadRule;
  /** The gym's smallest loadable jump for this exercise's load type (barbell 5 lb, dumbbell 2.5 or 5). */
  smallestStep: number;
};

/** One logged set — only what scoring needs. */
export type LoggedSet = { reps: number };

/** Outcome of an exercise inside a finished workout (data-model §5.1). */
export type Outcome = 'hit' | 'failed' | 'skipped';

/** The live numbers for an exercise in the current mesocycle (data-model `ExerciseProgress`). */
export type ExerciseProgress = {
  currentWeight: number;
  currentReps: number;
  consecutiveFailures: number;
  lastOutcome: Outcome | null;
};

/** What the app should do after applying an outcome. The app asks; the rules never decide. */
export type ProgressPrompt = 'plateau' | null;

export type ProgressResult = { progress: ExerciseProgress; prompt: ProgressPrompt };
