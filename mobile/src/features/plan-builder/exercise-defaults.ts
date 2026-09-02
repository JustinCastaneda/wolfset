import type { LoadType } from '@/lib/db/seed-exercises';
import type { ProgressionStrategy } from '@/lib/db/plan-store';

// What Add Exercise Details (Figma 123:1092 / 380:8897 / 380:10087) starts with, and the
// option rows of its Button Groups. Pure — tested.

/** Dumbbells and kettlebells are held per hand: the weight is the per-hand number
 *  (data-model §2 PlanExercise.startWeight — "never doubled"). */
export function isPerHand(loadType: LoadType): boolean {
  return loadType === 'dumbbell' || loadType === 'kettlebell';
}

/** A sane first weight when the lift has no history: an empty bar, a light pair, or
 *  nothing for bodyweight. The stepper moves it in 5s from there. */
export function defaultStartWeight(loadType: LoadType): number {
  switch (loadType) {
    case 'barbell':
      return 45;
    case 'dumbbell':
    case 'kettlebell':
      return 20;
    case 'machine':
      return 50;
    case 'cable':
      return 30;
    case 'bodyweight':
      return 0;
  }
}

/** The "We suggest" number: the last workout's weight plus the plan increment when
 *  every set hit the target, else the same weight again. */
export function suggestedWeight(
  last: { weight: number; reps: number; targetReps: number } | null,
  loadType: LoadType,
  increment = 5,
): number {
  if (!last) return defaultStartWeight(loadType);
  return last.reps >= last.targetReps ? last.weight + increment : last.weight;
}

export const SET_OPTIONS = [1, 3, 5, 10] as const;
export const REP_OPTIONS = [5, 8, 10, 12] as const;
export const CEILING_OPTIONS = [12, 16, 18, 20] as const;

/** Per-strategy defaults from the frames: Reps First starts at 5 sets (123:1092),
 *  the others at 3 (380:8897); every strategy starts at 10 reps. The Reps First ceiling
 *  defaults to 20 (decision: data-model §6 #1), not the frame's illustrative 18. */
export function defaultPrescription(strategy: ProgressionStrategy): {
  sets: number;
  reps: number;
  repCeiling: number;
} {
  return { sets: strategy === 'reps-first' ? 5 : 3, reps: 10, repCeiling: 20 };
}

export const DEFAULT_REST_SECONDS = 90;

export const STRATEGY_LABEL: Record<ProgressionStrategy, string> = {
  steady: 'Steady',
  'reps-first': 'Reps First',
  'by-feel': 'By Feel',
};

/** "1:30" for the Pacing row and the Day Summary captions. */
export function formatRest(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
