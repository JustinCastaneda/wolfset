import { getDb } from './database';
import type { Unit } from '@/lib/units';

// The profile row (data-model §2 — one row, every field nullable except the ones with
// defaults). Settings edits it (Figma 433:22471 and its subscreens); onboarding will
// write the same row. Bodyweight is stored in pounds and height in centimetres whatever
// the unit says — lib/units converts for display.

export type Experience = 'beginner' | 'intermediate' | 'advanced';
export type Goal = 'muscle' | 'strength' | 'endurance' | 'vibing';

/** The Equipment screen's checklist (433:22674) — what the gym has. */
export const EQUIPMENT = [
  { id: 'dumbbells', label: 'Dumbbells' },
  { id: 'barbells', label: 'Barbells' },
  { id: 'machines', label: 'Machines' },
  { id: 'treadmills', label: 'Treadmills' },
  { id: 'kettlebells', label: 'Kettlebells' },
  { id: 'pull-up-bars', label: 'Pull-up bars' },
  { id: 'exercise-bikes', label: 'Exercise Bikes' },
  { id: 'medicine-balls', label: 'Medicine Balls' },
] as const;
export type EquipmentId = (typeof EQUIPMENT)[number]['id'];

export type Profile = {
  unit: Unit;
  /** The dumbbell rack's smallest jump, in pounds: 5 or 2.5 (433:22844). */
  smallestStepDumbbell: number;
  equipment: EquipmentId[];
  experience: Experience | null;
  goal: Goal | null;
  /** Pounds. */
  bodyweight: number | null;
  /** Centimetres. */
  heightCm: number | null;
};

type ProfileRow = {
  unit: string;
  smallest_step_dumbbell: number;
  equipment: string;
  experience: string | null;
  goal: string | null;
  bodyweight: number | null;
  height_cm: number | null;
};

const EQUIPMENT_IDS = new Set<string>(EQUIPMENT.map((e) => e.id));

export function loadProfile(): Profile {
  const row = getDb().getFirstSync<ProfileRow>('SELECT * FROM profile WHERE id = 1');
  // The row is created by the migration; a missing one is a bug, but the defaults keep
  // Settings usable rather than blank.
  return {
    unit: row?.unit === 'kg' ? 'kg' : 'lb',
    smallestStepDumbbell: row?.smallest_step_dumbbell ?? 5,
    equipment: (row?.equipment ?? '')
      .split(',')
      .filter((id): id is EquipmentId => EQUIPMENT_IDS.has(id)),
    experience: asExperience(row?.experience ?? null),
    goal: asGoal(row?.goal ?? null),
    bodyweight: row?.bodyweight ?? null,
    heightCm: row?.height_cm ?? null,
  };
}

/** Every Settings screen saves the moment a value changes — no Save button on any of
 *  them (433:22674 … 433:27536). */
export function saveProfile(patch: Partial<Profile>) {
  const next = { ...loadProfile(), ...patch };
  getDb().runSync(
    `UPDATE profile SET unit = ?, smallest_step_dumbbell = ?, equipment = ?, experience = ?,
       goal = ?, bodyweight = ?, height_cm = ? WHERE id = 1`,
    [
      next.unit,
      next.smallestStepDumbbell,
      next.equipment.join(','),
      next.experience,
      next.goal,
      next.bodyweight,
      next.heightCm,
    ],
  );
}

function asExperience(value: string | null): Experience | null {
  return value === 'beginner' || value === 'intermediate' || value === 'advanced' ? value : null;
}

function asGoal(value: string | null): Goal | null {
  return value === 'muscle' || value === 'strength' || value === 'endurance' || value === 'vibing'
    ? value
    : null;
}
