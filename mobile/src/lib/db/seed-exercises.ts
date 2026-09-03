// The starter exercise catalog (data-model §2 Exercise), seeded once by migration v5.
// Names, load types and muscles follow the Search Exercise frame (384:11596) plus the
// lifts the starter plan already uses — those keep their ids so progress rows still match.

export type LoadType = 'barbell' | 'dumbbell' | 'machine' | 'bodyweight' | 'kettlebell' | 'cable';

export type SeedExercise = {
  id: string;
  name: string;
  loadType: LoadType;
  muscles: string[];
  unilateral: boolean;
  description: string;
};

const ex = (
  id: string,
  name: string,
  loadType: LoadType,
  muscles: string[],
  description: string,
  unilateral = false,
): SeedExercise => ({ id, name, loadType, muscles, unilateral, description });

export const STARTER_EXERCISES: SeedExercise[] = [
  ex(
    'deadlift',
    'Deadlift',
    'barbell',
    ['Legs', 'Back'],
    'Hinge at the hips, bar close to the shins, stand tall.',
  ),
  ex(
    'squat',
    'Squat',
    'barbell',
    ['Legs', 'Back'],
    'Bar on the back, sit between the heels, drive up.',
  ),
  ex(
    'bench',
    'Bench Press',
    'barbell',
    ['Chest', 'Triceps'],
    'Bar to the sternum, feet planted, press to lockout.',
  ),
  ex(
    'db-curl',
    'Dumbbell Bicep Curl',
    'dumbbell',
    ['Biceps'],
    'Elbows pinned, curl without swinging.',
  ),
  ex(
    'db-front-raise',
    'Dumbbell Front Raise',
    'dumbbell',
    ['Shoulders'],
    'Raise to shoulder height with a soft elbow.',
  ),
  ex(
    'bb-row',
    'Barbell Row',
    'barbell',
    ['Back', 'Shoulders'],
    'Hinge, pull the bar to the lower ribs, squeeze.',
  ),
  ex(
    'pushup',
    'Pushup',
    'bodyweight',
    ['Chest', 'Triceps'],
    'Body in one line, chest to the floor, press.',
  ),
  ex(
    'ohp',
    'Overhead Press',
    'barbell',
    ['Shoulders'],
    'Press straight up, head through at the top.',
  ),
  ex('db-squat', 'Dumbbell Squat', 'dumbbell', ['Legs'], 'Dumbbells at the sides, squat to depth.'),
  ex('situp', 'Situp', 'bodyweight', ['Core'], 'Roll up, touch the knees, lower with control.'),
  ex(
    'cable-pushdown',
    'Cable Tricep Pushdown',
    'cable',
    ['Triceps'],
    'Elbows pinned, push to full extension.',
  ),
  ex('hammer-curl', 'Hammer Curl', 'dumbbell', ['Biceps'], 'Neutral grip curl, thumbs up.'),
  ex(
    'russian-twist',
    'Russian Twist',
    'bodyweight',
    ['Core'],
    'Seated, feet up, rotate side to side.',
  ),
  // The starter plan's lifts (seed-plan.ts) — same ids.
  ex(
    'bss',
    'Bulgarian Split Squat',
    'dumbbell',
    ['Quads', 'Glutes'],
    'Rear foot elevated on a bench, front knee tracking over the toe. Descend until the back knee nearly touches, drive up through the front foot. One side at a time.',
    true,
  ),
  ex(
    'rdl',
    'Romanian Deadlift',
    'barbell',
    ['Hamstrings', 'Glutes'],
    'Soft knees, push the hips back, bar along the thighs.',
  ),
  ex(
    'fsq',
    'Front Squat',
    'barbell',
    ['Quads', 'Core'],
    'Bar on the front rack, elbows high, sit straight down.',
  ),
  ex(
    'wlu',
    'Walking Lunges',
    'dumbbell',
    ['Quads', 'Glutes'],
    'Long step, back knee to the floor, step through.',
    true,
  ),
  ex(
    'gsq',
    'Goblet Squat',
    'dumbbell',
    ['Quads', 'Glutes'],
    'Dumbbell at the chest, elbows inside the knees at the bottom.',
  ),
  ex(
    'stu',
    'Step-Ups',
    'dumbbell',
    ['Quads', 'Glutes'],
    'Whole foot on the box, drive through the heel, control the way down.',
    true,
  ),
];
