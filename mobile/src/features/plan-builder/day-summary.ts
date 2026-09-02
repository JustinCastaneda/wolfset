import type { DayExercise } from '@/lib/db/plan-store';
import { formatRest, STRATEGY_LABEL } from './exercise-defaults';

// The numbers on Day Summary (Figma 123:1944): the subtitle, the three stat tiles, and
// each row's caption. Pure — tested.

export function totalSets(exercises: DayExercise[]): number {
  return exercises.reduce((n, e) => n + e.sets, 0);
}

/** Planned volume, per-hand lifts counted once (the stored number is per hand). */
export function plannedVolume(exercises: DayExercise[]): number {
  return exercises.reduce((n, e) => n + e.sets * e.reps * e.startWeight, 0);
}

export function muscleGroupCount(exercises: DayExercise[]): number {
  return new Set(exercises.flatMap((e) => e.muscles)).size;
}

/** A rough clock for the subtitle: every set is its rest plus about a minute of work,
 *  rounded to 5 minutes so the estimate never pretends to be precise. */
export function estimatedMinutes(exercises: DayExercise[]): number {
  const seconds = exercises.reduce((n, e) => n + e.sets * (e.restSeconds + 60), 0);
  return Math.max(5, Math.round(seconds / 60 / 5) * 5);
}

/** "Reps First • 1 Exercise • 20 minutes" */
export function daySubtitle(strategy: DayExercise['strategy'], exercises: DayExercise[]): string {
  const n = exercises.length;
  const lifts = `${n} ${n === 1 ? 'Exercise' : 'Exercises'}`;
  if (n === 0) return `${STRATEGY_LABEL[strategy]} • No exercises yet`;
  return `${STRATEGY_LABEL[strategy]} • ${lifts} • ${estimatedMinutes(exercises)} minutes`;
}

/** The row caption: an override in brand, otherwise nothing before the rest. */
export function rowCaption(e: DayExercise): { override: string | null; rest: string } {
  return {
    override: e.overridesProgression ? 'Progression Override' : null,
    rest: `${formatRest(e.restSeconds)} Rest`,
  };
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}
