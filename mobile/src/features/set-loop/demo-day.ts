import type { SessionExercise } from './types';

// PLACEHOLDER until storage lands (Phase 4 continues): the Workout A day from the
// Figma deload frame (359:1470), verbatim weights and prescriptions, so the loop can
// be trained with today. Replaced by the plan tables from the data model.
export const DEMO_DAY_NAME = 'Workout A';

export const DEMO_DAY: SessionExercise[] = [
  {
    exerciseId: 'bss',
    name: 'Bulgarian Split Squat',
    prescribedSets: 5,
    targetReps: 5,
    weight: 85,
    restSeconds: 90,
    autoStartTimer: true,
  },
  {
    exerciseId: 'rdl',
    name: 'Romanian Deadlift',
    prescribedSets: 4,
    targetReps: 8,
    weight: 95,
    restSeconds: 90,
    autoStartTimer: true,
  },
  {
    exerciseId: 'fsq',
    name: 'Front Squat',
    prescribedSets: 5,
    targetReps: 6,
    weight: 90,
    restSeconds: 180,
    autoStartTimer: true,
  },
  {
    exerciseId: 'wlu',
    name: 'Walking Lunges',
    prescribedSets: 3,
    targetReps: 12,
    weight: 60,
    restSeconds: 60,
    autoStartTimer: true,
  },
  {
    exerciseId: 'gsq',
    name: 'Goblet Squat',
    prescribedSets: 4,
    targetReps: 10,
    weight: 50,
    restSeconds: 90,
    autoStartTimer: true,
    // The demo's By Feel lift: rep range 10–13 (targetReps .. +3), poke grid on finish.
    strategy: 'by-feel',
  },
  {
    exerciseId: 'stu',
    name: 'Step-Ups',
    prescribedSets: 5,
    targetReps: 8,
    weight: 70,
    restSeconds: 90,
    autoStartTimer: true,
  },
];
