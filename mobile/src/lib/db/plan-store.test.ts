import { describe, expect, it } from '@jest/globals';
import { startSession } from '@/features/set-loop/machine';
import { sessionExercisesFrom, type PlanExerciseRow } from './plan-store';
import { STARTER_PLAN } from './seed-plan';

const row = (over: Partial<PlanExerciseRow>): PlanExerciseRow => ({
  exercise_id: 'squat',
  name: 'Squat',
  sets: 5,
  reps: 5,
  start_weight: 135,
  rest_seconds: 90,
  auto_start_timer: 1,
  strategy: null,
  ...over,
});

describe('sessionExercisesFrom — plan rows become what the loop starts with', () => {
  it('maps the prescription one-to-one', () => {
    expect(sessionExercisesFrom([row({})])).toEqual([
      {
        exerciseId: 'squat',
        name: 'Squat',
        prescribedSets: 5,
        targetReps: 5,
        weight: 135,
        restSeconds: 90,
        autoStartTimer: true,
      },
    ]);
  });

  it('a by-feel row carries its strategy; a null strategy inherits the plan default (steady)', () => {
    const [byFeel, steady] = sessionExercisesFrom([
      row({ strategy: 'by-feel' }),
      row({ strategy: null }),
    ]);
    expect(byFeel.strategy).toBe('by-feel');
    expect(steady.strategy).toBeUndefined();
  });

  it('auto_start_timer is a SQLite 0/1, not a boolean', () => {
    expect(sessionExercisesFrom([row({ auto_start_timer: 0 })])[0].autoStartTimer).toBe(false);
  });
});

describe('STARTER_PLAN — the seeded Workout A the loop trains from until a plan is built', () => {
  const day = STARTER_PLAN.days[0];

  it('is the Figma Workout A (359:1470): six lifts, Goblet Squat by feel', () => {
    expect(day.name).toBe('Workout A');
    expect(day.exercises.map((e) => e.name)).toEqual([
      'Bulgarian Split Squat',
      'Romanian Deadlift',
      'Front Squat',
      'Walking Lunges',
      'Goblet Squat',
      'Step-Ups',
    ]);
    expect(day.exercises.find((e) => e.exerciseId === 'gsq')?.strategy).toBe('by-feel');
  });

  it('keeps the exercise ids progress rows were keyed by, so earned weights carry over', () => {
    expect(day.exercises.map((e) => e.exerciseId)).toEqual([
      'bss',
      'rdl',
      'fsq',
      'wlu',
      'gsq',
      'stu',
    ]);
  });

  it('starts a session the machine accepts, with the planned volume unchanged (14,825 lb)', () => {
    const rows: PlanExerciseRow[] = day.exercises.map((e) => ({
      exercise_id: e.exerciseId,
      name: e.name,
      sets: e.sets,
      reps: e.reps,
      start_weight: e.startWeight,
      rest_seconds: e.restSeconds,
      auto_start_timer: e.autoStartTimer ? 1 : 0,
      strategy: e.strategy,
    }));
    const state = startSession('plan', sessionExercisesFrom(rows));
    const planned = state.exercises.reduce(
      (sum, e) => sum + (e.prescribedSets ?? 0) * e.targetReps * e.weight,
      0,
    );
    expect(planned).toBe(14_825);
  });
});
