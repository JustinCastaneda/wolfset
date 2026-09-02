import type { SessionExercise } from '@/features/set-loop/types';

// The starter plan seeded on first launch (migration v4): the Workout A day from the
// Figma deload frame (359:1470), verbatim weights and prescriptions. It replaces the
// hardcoded demo day so the loop trains from real plan rows — the same rows the plan
// builder edits. Exercise ids are stable slugs: exercise_progress is keyed by them,
// so weights earned before this migration still carry over.

export const STARTER_PLAN = {
  id: 'plan-starter',
  name: 'Plan A',
  days: [
    {
      id: 'day-starter-a',
      name: 'Workout A',
      exercises: [
        lift('bss', 'Bulgarian Split Squat', 5, 5, 85, 90),
        lift('rdl', 'Romanian Deadlift', 4, 8, 95, 90),
        lift('fsq', 'Front Squat', 5, 6, 90, 180),
        lift('wlu', 'Walking Lunges', 3, 12, 60, 60),
        // The starter's By Feel lift: rep range 10–13 (reps .. +3), poke grid on finish.
        { ...lift('gsq', 'Goblet Squat', 4, 10, 50, 90), strategy: 'by-feel' as const },
        lift('stu', 'Step-Ups', 5, 8, 70, 90),
      ],
    },
  ],
};

export type SeedExercise = {
  exerciseId: string;
  name: string;
  sets: number;
  reps: number;
  startWeight: number;
  restSeconds: number;
  autoStartTimer: boolean;
  strategy: NonNullable<SessionExercise['strategy']> | null;
};

function lift(
  exerciseId: string,
  name: string,
  sets: number,
  reps: number,
  startWeight: number,
  restSeconds: number,
): SeedExercise {
  return {
    exerciseId,
    name,
    sets,
    reps,
    startWeight,
    restSeconds,
    autoStartTimer: true,
    strategy: null,
  };
}
