import { getDb } from './database';
import type { LoadType } from './seed-exercises';

// Reads the exercise catalog (data-model §2 Exercise). Search Exercise lists it; Add
// Exercise Details shows one row's chips and copy.

export type Exercise = {
  id: string;
  name: string;
  loadType: LoadType;
  muscles: string[];
  unilateral: boolean;
  description: string;
};

type Row = {
  id: string;
  name: string;
  load_type: string;
  muscle_groups: string;
  is_unilateral: number;
  description: string;
};

export function loadExercises(): Exercise[] {
  return getDb()
    .getAllSync<Row>(
      'SELECT id, name, load_type, muscle_groups, is_unilateral, description FROM exercises ORDER BY sort_order ASC, name ASC',
    )
    .map(fromRow);
}

export function getExercise(id: string): Exercise | null {
  const row = getDb().getFirstSync<Row>(
    'SELECT id, name, load_type, muscle_groups, is_unilateral, description FROM exercises WHERE id = ?',
    [id],
  );
  return row ? fromRow(row) : null;
}

function fromRow(r: Row): Exercise {
  return {
    id: r.id,
    name: r.name,
    loadType: r.load_type as LoadType,
    muscles: r.muscle_groups.split(',').filter(Boolean),
    unilateral: r.is_unilateral === 1,
    description: r.description,
  };
}

/** Search matches any word prefix in the name or the muscles ("ben" → Bench Press,
 *  "tri" → Pushup via Triceps). Pure — tested. */
export function matchesQuery(exercise: Pick<Exercise, 'name' | 'muscles'>, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const words = [...exercise.name.split(/\s+/), ...exercise.muscles].map((w) => w.toLowerCase());
  return exercise.name.toLowerCase().startsWith(q) || words.some((w) => w.startsWith(q));
}
