// The progression domain, as written in docs/data-model.md §3 and §5.
// Plain types — no React, no storage. Everything here is testable in isolation.

export type Unit = 'lb' | 'kg';

export type Strategy = 'steady' | 'reps-first' | 'by-feel';

/** How an exercise gets harder between sessions (data-model §3). */
export type ProgressionRule =
  | { strategy: 'steady' }
  | { strategy: 'reps-first'; repStep: number }
  // By Feel works inside a rep range (default 5–8) — the Calculation Engine, Figma 384:11049.
  | { strategy: 'by-feel'; repRangeMin: number; repRangeMax: number };

/** The post-exercise poke on the By Feel grid (Figma 384:10881). y axis: reps left in the
 *  tank ("Nothing Left" 0 … "Plenty Left" 4+). x axis: how the reps looked. */
export type FeelRating = {
  reserve: '0' | '1' | '2' | '3' | '4plus';
  form: 'clean' | 'bad';
};

/** One finished By Feel session as the engine sees it. `rating: null` = the grid was
 *  skipped (it auto-skips after 8 s). */
export type ByFeelSession = {
  outcome: 'hit' | 'failed';
  rating: FeelRating | null;
};

/** What the engine knows about the previous session — and only the previous one
 *  (the engine's "Sources" panel: "History. Only ever the previous one."). */
export type ByFeelHistory = ByFeelSession & {
  /** True when that session sat at the top of the rep range and did not move. */
  heldAtTop: boolean;
};

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

/** What the app should ask after applying an outcome. The app asks; the rules never decide.
 *  `plateau`: deload or end the meso? (steady / reps-first, decision 11b)
 *  `offer-steady`: the By Feel grid went unrated two sessions running — suggest switching
 *  this exercise to Steady (the engine's "From Past Sessions" panel). */
export type ProgressPrompt = 'plateau' | 'offer-steady' | null;

export type ProgressResult = { progress: ExerciseProgress; prompt: ProgressPrompt };
