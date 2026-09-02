import { describe, expect, it } from '@jest/globals';
import { reduce, startSession } from '@/features/set-loop/machine';
import { migrateSnapshot, workoutRows } from './session-store';
import type { SessionExercise } from '@/features/set-loop/types';

const squat: SessionExercise = {
  exerciseId: 'squat',
  name: 'Squat',
  prescribedSets: 1,
  targetReps: 5,
  weight: 135,
  restSeconds: 90,
  autoStartTimer: true,
};

describe('workoutRows — machine state becomes history rows', () => {
  it('maps a finished session to one workout row plus its sets', () => {
    // One prescribed set → logging it auto-finishes the workout.
    const done = reduce(startSession('plan', [squat]), { type: 'setLogged', reps: 5, at: 5_000 });
    expect(done.phase).toEqual({ name: 'done', endedEarly: false });

    const rows = workoutRows(done, 1_000, 61_000);
    expect(rows.workout).toMatchObject({
      kind: 'plan',
      status: 'finished',
      durationSec: 60,
      totalVolume: 675,
      setCount: 1,
    });
    expect(rows.sets).toHaveLength(1);
    expect(rows.sets[0]).toMatchObject({
      exerciseId: 'squat',
      exerciseName: 'Squat',
      setIndex: 0,
      weight: 135,
      reps: 5,
      loggedAt: 5_000,
    });
    expect(rows.workout.id).not.toBe(rows.sets[0].id);
  });

  it('flags ended-early sessions', () => {
    const s = reduce(startSession('plan', [{ ...squat, prescribedSets: 3 }]), {
      type: 'workoutEnded',
      at: 2_000,
    });
    expect(workoutRows(s, 1_000, 2_000).workout.status).toBe('ended-early');
  });

  it('the snapshot round-trips through JSON unchanged (what resume relies on)', () => {
    let s = startSession('plan', [{ ...squat, prescribedSets: 3 }]);
    s = reduce(s, { type: 'setLogged', reps: 5, at: 5_000 });
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});

describe('migrateSnapshot — old saves never brick resume', () => {
  it('fills the By Feel fields missing from pre-#32 snapshots', () => {
    const old = startSession('plan', [squat]) as Record<string, unknown>;
    delete old.pendingRatings;
    delete old.feelRatings;
    const migrated = migrateSnapshot(JSON.parse(JSON.stringify(old)));
    expect(migrated.pendingRatings).toEqual([]);
    expect(migrated.feelRatings).toEqual({});
  });

  it('passes a current snapshot through unchanged', () => {
    const s = reduce(startSession('plan', [squat]), { type: 'setLogged', reps: 5, at: 1 });
    expect(migrateSnapshot(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  it('rejects garbage so the corrupt-drop path can clear it', () => {
    expect(() => migrateSnapshot(null)).toThrow();
    expect(() => migrateSnapshot({ nonsense: true })).toThrow();
  });
});
