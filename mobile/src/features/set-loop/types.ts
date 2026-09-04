// The set loop — the centre of the app, built as a state machine, not as screens
// (handoff brief §01: "one state machine, five screens, six transitions").
// Plain types, no React, no storage; the reducer lives in machine.ts.

/** What the session knows about one exercise when it starts. Plan mode carries the
 *  prescription; freestyle leaves `prescribedSets` null — sets are open-ended and the
 *  loop only ends when the user ends it (brief §01). */
export type SessionExercise = {
  exerciseId: string;
  name: string;
  /** null = freestyle, open-ended. */
  prescribedSets: number | null;
  targetReps: number;
  /** What Log a Set pre-fills; Edit Weights changes it for future sets too. */
  weight: number;
  restSeconds: number;
  autoStartTimer: boolean;
  /** How this lift progresses (the plan default, or a per-lift override). Defaults to
   *  steady; by-feel lifts get the poke grid when their sets finish (engine: Figma
   *  384:11049); reps-first lifts climb reps to `repCeiling` before adding weight. */
  strategy?: 'steady' | 'reps-first' | 'by-feel';
  /** Reps First only: "Max Reps before Weight Increase". Undefined = plan default (20). */
  repCeiling?: number;
  /** True when `strategy` is this lift's own, not the plan's default — the overviews'
   *  "Progression Override" caption (123:3072) instead of "Defaults". */
  overridesProgression?: boolean;
};

/** The poke on the By Feel grid (384:10881): x = form, y = reps left in the tank. */
export type FeelRating = {
  reserve: '0' | '1' | '2' | '3' | '4plus';
  form: 'clean' | 'bad';
};

/** One logged set, the machine's output. Mirrors data-model `WorkoutSet`. */
export type LoggedSet = {
  exerciseIndex: number;
  setIndex: number;
  weight: number;
  reps: number;
  loggedAt: number;
  restStartedAt: number | null;
  restEndedAt: number | null;
  restEndReason: 'timer' | 'continue' | null;
};

/** Where the loop is. A discriminated union — no boolean soup (conventions §4). */
export type Phase =
  | { name: 'logging' }
  /** The Post Set Timer. `recovered` mirrors the HR gate: it turns Continue from muted
   *  to live (watch Timer screens) — it does not transition by itself. */
  | { name: 'resting'; startedAt: number; restSeconds: number; recovered: boolean }
  /** The Edit Weights detour — off the loop, not a step in it (brief §01). */
  | { name: 'editing-weight' }
  /** Every prescribed set of every exercise is done. Extra sets stay possible
   *  (scoring treats them as bonus); Finish is the real exit. */
  | { name: 'all-sets-done' }
  | { name: 'done'; endedEarly: boolean };

export type SessionState = {
  kind: 'plan' | 'freestyle';
  exercises: SessionExercise[];
  exerciseIndex: number;
  setIndex: number;
  sets: LoggedSet[];
  phase: Phase;
  /** Exercise indexes whose By Feel grid still awaits an answer (or the 8s skip). */
  pendingRatings: number[];
  /** Answers so far; null = skipped. Read by settle when the session ends. */
  feelRatings: Record<number, FeelRating | null>;
};

/** Everything that can happen to the loop. Timestamps come from the caller's clock —
 *  the machine never reads time itself (conventions §4). */
export type SessionEvent =
  | { type: 'setLogged'; reps: number; at: number }
  | { type: 'restEnded'; reason: 'timer' | 'continue'; at: number }
  | { type: 'recoveredChanged'; recovered: boolean }
  | { type: 'weightEditOpened' }
  | { type: 'weightSaved'; weight: number }
  | { type: 'weightEditClosed' }
  /** Freestyle: a new exercise joins mid-session and becomes current. */
  | { type: 'exerciseAdded'; exercise: SessionExercise; at: number }
  /** Jump to any exercise from the overview, even midway through sets (Justin,
   *  2026-09-02). Resumes at that exercise's next unlogged set; cuts a running rest. */
  | { type: 'exerciseJumped'; index: number; at: number }
  /** The poke grid answered (rating) or auto-skipped after 8 s (null). */
  | { type: 'feelRated'; exerciseIndex: number; rating: FeelRating | null }
  /** Skip Set (watch Actions panel 164:4103): move on without logging — nothing is
   *  recorded, no rest starts, and the lift scores as if the set was never done. During
   *  a rest it ends the rest and skips the set that was coming. */
  | { type: 'setSkipped'; at: number }
  /** Undo Skip: back to the first skipped set of this lift (Justin, 2026-09-03: a skip
   *  with no way back "feels bad"). A running rest keeps running. */
  | { type: 'setUnskipped' }
  /** Change Workout (watch 164:4192, or the phone): another plan day's lifts replace the
   *  workout — only while nothing has been logged or skipped, so no set is ever lost. */
  | { type: 'dayChanged'; exercises: SessionExercise[] }
  | { type: 'workoutEnded'; at: number };
