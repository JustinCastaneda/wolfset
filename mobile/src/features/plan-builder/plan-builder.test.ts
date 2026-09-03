import { describe, expect, it } from '@jest/globals';
import type { DayExercise } from '@/lib/db/plan-store';
import { matchesQuery } from '@/lib/db/exercise-store';
import {
  daySubtitle,
  estimatedMinutes,
  muscleGroupCount,
  plannedVolume,
  rowCaption,
  totalSets,
} from './day-summary';
import {
  defaultPrescription,
  defaultStartWeight,
  formatRest,
  isPerHand,
  suggestedWeight,
} from './exercise-defaults';

const lift = (over: Partial<DayExercise>): DayExercise => ({
  id: 'x',
  exerciseId: 'bss',
  name: 'Bulgarian Split Squat',
  sets: 5,
  reps: 5,
  startWeight: 85,
  restSeconds: 90,
  strategy: 'reps-first',
  overridesProgression: false,
  repCeiling: null,
  muscles: ['Quads', 'Glutes'],
  ...over,
});

describe('Add Exercise Details defaults (123:1092)', () => {
  it('dumbbells and kettlebells are per hand; bars are not', () => {
    expect(isPerHand('dumbbell')).toBe(true);
    expect(isPerHand('kettlebell')).toBe(true);
    expect(isPerHand('barbell')).toBe(false);
    expect(isPerHand('bodyweight')).toBe(false);
  });

  it('a lift with no history starts from the empty bar / a light pair / nothing', () => {
    expect(defaultStartWeight('barbell')).toBe(45);
    expect(defaultStartWeight('dumbbell')).toBe(20);
    expect(defaultStartWeight('bodyweight')).toBe(0);
  });

  it('"We suggest" adds the increment after a hit and repeats after a miss', () => {
    expect(suggestedWeight({ weight: 80, reps: 5, targetReps: 5 }, 'dumbbell')).toBe(85);
    expect(suggestedWeight({ weight: 80, reps: 4, targetReps: 5 }, 'dumbbell')).toBe(80);
    expect(suggestedWeight(null, 'barbell')).toBe(45);
  });

  it('Reps First starts at 5 sets, the others at 3; everyone at 10 reps, ceiling 20', () => {
    expect(defaultPrescription('reps-first')).toEqual({ sets: 5, reps: 10, repCeiling: 20 });
    expect(defaultPrescription('steady')).toEqual({ sets: 3, reps: 10, repCeiling: 20 });
    expect(defaultPrescription('by-feel').sets).toBe(3);
  });

  it('rest reads as a clock', () => {
    expect(formatRest(90)).toBe('1:30');
    expect(formatRest(60)).toBe('1:00');
    expect(formatRest(105)).toBe('1:45');
  });
});

describe('Day Summary numbers (123:1944)', () => {
  const day = [
    lift({}),
    lift({
      id: 'y',
      exerciseId: 'rdl',
      name: 'RDL',
      sets: 4,
      reps: 8,
      startWeight: 95,
      muscles: ['Hamstrings', 'Glutes'],
    }),
  ];

  it('totals sets and planned volume', () => {
    expect(totalSets(day)).toBe(9);
    expect(plannedVolume(day)).toBe(5 * 5 * 85 + 4 * 8 * 95);
  });

  it('counts distinct muscle groups', () => {
    expect(muscleGroupCount(day)).toBe(3); // Quads, Glutes, Hamstrings
  });

  it('estimates minutes in 5-minute steps and never below 5', () => {
    expect(estimatedMinutes([lift({ sets: 1, restSeconds: 30 })])).toBe(5);
    expect(estimatedMinutes(day)).toBe(25); // 9 sets × 150 s = 22.5 min → 25
  });

  it('writes the subtitle, singular and empty included', () => {
    expect(daySubtitle('reps-first', [lift({})])).toBe('Reps First • 1 Exercise • 15 minutes');
    expect(daySubtitle('steady', day)).toBe('Steady • 2 Exercises • 25 minutes');
    expect(daySubtitle('by-feel', [])).toBe('By Feel • No exercises yet');
  });

  it('flags a progression override in the row caption', () => {
    expect(rowCaption(lift({}))).toEqual({ override: null, rest: '1:30 Rest' });
    expect(rowCaption(lift({ overridesProgression: true })).override).toBe('Progression Override');
  });
});

describe('Search Exercise matching (384:11596)', () => {
  const bench = { name: 'Bench Press', muscles: ['Chest', 'Triceps'] };
  it('matches word prefixes in the name and the muscles, case-insensitively', () => {
    expect(matchesQuery(bench, 'ben')).toBe(true);
    expect(matchesQuery(bench, 'press')).toBe(true);
    expect(matchesQuery(bench, 'TRI')).toBe(true);
    expect(matchesQuery(bench, 'ess')).toBe(false);
  });
  it('an empty query matches everything', () => {
    expect(matchesQuery(bench, '   ')).toBe(true);
  });
});
