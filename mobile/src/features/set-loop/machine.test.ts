import { describe, expect, it } from '@jest/globals';
import { reduce, restRemaining, startSession } from './machine';
import type { SessionExercise, SessionState } from './types';

// A two-lift plan day: squat 2×5 @ 135 (1:30 rest), curls 1×10 @ 30 (1:00 rest).
const squat: SessionExercise = {
  exerciseId: 'squat',
  name: 'Squat',
  prescribedSets: 2,
  targetReps: 5,
  weight: 135,
  restSeconds: 90,
  autoStartTimer: true,
};
const curl: SessionExercise = {
  exerciseId: 'curl',
  name: 'Curl',
  prescribedSets: 1,
  targetReps: 10,
  weight: 30,
  restSeconds: 60,
  autoStartTimer: true,
};

const t = (s: number) => 1_000_000 + s * 1000; // a readable clock: t(0), t(90)…

const logAndRest = (state: SessionState, at: number, reason: 'timer' | 'continue' = 'timer') => {
  const rested = reduce(state, { type: 'setLogged', reps: 5, at });
  return reduce(rested, { type: 'restEnded', reason, at: at + 90_000 });
};

describe('the loop — log a set, rest, next set', () => {
  it('logging a set starts the timer on its own', () => {
    const s = reduce(startSession('plan', [squat, curl]), { type: 'setLogged', reps: 5, at: t(0) });
    expect(s.phase).toEqual({
      name: 'resting',
      startedAt: t(0),
      restSeconds: 90,
      recovered: false,
    });
    expect(s.sets).toHaveLength(1);
    expect(s.sets[0]).toMatchObject({ weight: 135, reps: 5, restStartedAt: t(0) });
  });

  it('0:00 and Continue are two triggers with one destination (brief §01)', () => {
    const resting = reduce(startSession('plan', [squat, curl]), {
      type: 'setLogged',
      reps: 5,
      at: t(0),
    });
    const byTimer = reduce(resting, { type: 'restEnded', reason: 'timer', at: t(90) });
    const byTap = reduce(resting, { type: 'restEnded', reason: 'continue', at: t(40) });
    for (const s of [byTimer, byTap]) {
      expect(s.phase).toEqual({ name: 'logging' });
      expect(s.setIndex).toBe(1);
    }
    expect(byTimer.sets[0].restEndReason).toBe('timer');
    expect(byTap.sets[0].restEndReason).toBe('continue');
  });

  it('sets exhausted → next lift, with the next lift’s own rest seconds', () => {
    const twoSetCurl = { ...curl, prescribedSets: 2 };
    let s = logAndRest(startSession('plan', [squat, twoSetCurl]), t(0));
    s = logAndRest(s, t(120)); // squat set 2 → advance to curls
    expect(s.exerciseIndex).toBe(1);
    expect(s.setIndex).toBe(0);
    s = reduce(s, { type: 'setLogged', reps: 10, at: t(300) });
    expect(s.phase).toMatchObject({ name: 'resting', restSeconds: 60 });
  });

  it('the last rep of the last set ends the workout on its own — no rest, no prompt', () => {
    let s = logAndRest(startSession('plan', [squat, curl]), t(0));
    s = logAndRest(s, t(120));
    s = reduce(s, { type: 'setLogged', reps: 10, at: t(300) });
    expect(s.phase).toEqual({ name: 'done', endedEarly: false });
    expect(s.sets).toHaveLength(3);
    expect(s.sets[2].restStartedAt).toBeNull(); // no timer after the final set
  });

  it('auto-finish also fires when the last unfinished lift completes out of order', () => {
    let s = startSession('plan', [squat, curl]);
    s = reduce(s, { type: 'exerciseJumped', index: 1, at: t(0) }); // curls first
    s = reduce(s, { type: 'setLogged', reps: 10, at: t(10) });
    s = reduce(s, { type: 'restEnded', reason: 'continue', at: t(20) }); // → back to squats
    expect(s.exerciseIndex).toBe(0);
    s = logAndRest(s, t(30));
    s = reduce(s, { type: 'setLogged', reps: 5, at: t(200) }); // squat set 2 = last remaining
    expect(s.phase).toEqual({ name: 'done', endedEarly: false });
  });
});

describe('the rest timer', () => {
  it('counts down on the caller’s clock, never below zero', () => {
    const s = reduce(startSession('plan', [squat]), { type: 'setLogged', reps: 5, at: t(0) });
    expect(restRemaining(s, t(0))).toBe(90);
    expect(restRemaining(s, t(30))).toBe(60);
    expect(restRemaining(s, t(500))).toBe(0);
  });

  it('is null when not resting', () => {
    expect(restRemaining(startSession('plan', [squat]), t(0))).toBeNull();
  });

  it('the HR gate flips Continue live but never transitions by itself', () => {
    let s = reduce(startSession('plan', [squat]), { type: 'setLogged', reps: 5, at: t(0) });
    s = reduce(s, { type: 'recoveredChanged', recovered: true });
    expect(s.phase).toMatchObject({ name: 'resting', recovered: true });
  });
});

describe('the Edit Weights detour', () => {
  it('opens off logging, saves for future sets, and returns to the loop', () => {
    let s = startSession('plan', [squat, curl]);
    s = reduce(s, { type: 'weightEditOpened' });
    expect(s.phase).toEqual({ name: 'editing-weight' });
    s = reduce(s, { type: 'weightSaved', weight: 140 });
    expect(s.phase).toEqual({ name: 'logging' });
    expect(s.exercises[0].weight).toBe(140);
    expect(s.exercises[1].weight).toBe(30); // only the current lift changes
    const logged = reduce(s, { type: 'setLogged', reps: 5, at: t(0) });
    expect(logged.sets[0].weight).toBe(140);
  });

  it('closing without saving changes nothing', () => {
    let s = reduce(startSession('plan', [squat]), { type: 'weightEditOpened' });
    s = reduce(s, { type: 'weightEditClosed' });
    expect(s.phase).toEqual({ name: 'logging' });
    expect(s.exercises[0].weight).toBe(135);
  });

  it('cannot open mid-rest — it is a detour off Log a Set, not the timer', () => {
    const resting = reduce(startSession('plan', [squat]), { type: 'setLogged', reps: 5, at: t(0) });
    expect(reduce(resting, { type: 'weightEditOpened' }).phase.name).toBe('resting');
  });
});

describe('jumping between exercises (Justin, 2026-09-02)', () => {
  it('jumps to any exercise and resumes at its next unlogged set', () => {
    let s = logAndRest(startSession('plan', [squat, curl]), t(0)); // squat set 1 done
    s = reduce(s, { type: 'exerciseJumped', index: 1, at: t(100) });
    expect(s.exerciseIndex).toBe(1);
    expect(s.setIndex).toBe(0);
    expect(s.phase).toEqual({ name: 'logging' });
    // jump back mid-way: squat resumes at set 2, not set 1
    s = reduce(s, { type: 'exerciseJumped', index: 0, at: t(110) });
    expect(s.setIndex).toBe(1);
  });

  it('jumping mid-rest cuts the rest short and records it', () => {
    const resting = reduce(startSession('plan', [squat, curl]), {
      type: 'setLogged',
      reps: 5,
      at: t(0),
    });
    const s = reduce(resting, { type: 'exerciseJumped', index: 1, at: t(30) });
    expect(s.phase).toEqual({ name: 'logging' });
    expect(s.sets[0].restEndedAt).toBe(t(30));
    expect(s.sets[0].restEndReason).toBe('continue');
  });

  it('advancing wraps past finished lifts back to earlier unfinished ones', () => {
    let s = startSession('plan', [squat, curl]);
    s = reduce(s, { type: 'exerciseJumped', index: 1, at: t(0) });
    s = reduce(s, { type: 'setLogged', reps: 10, at: t(10) }); // curls done (1 set)
    s = reduce(s, { type: 'restEnded', reason: 'timer', at: t(70) });
    expect(s.exerciseIndex).toBe(0); // wrapped back to squats
    expect(s.setIndex).toBe(0);
  });

  it('an out-of-range jump changes nothing', () => {
    const s = startSession('plan', [squat]);
    expect(reduce(s, { type: 'exerciseJumped', index: 5, at: t(0) })).toBe(s);
  });
});

describe('freestyle', () => {
  const open: SessionExercise = { ...squat, prescribedSets: null };

  it('sets are open-ended — exhaustion never happens', () => {
    let s = startSession('freestyle', [open]);
    for (let i = 0; i < 10; i++) s = logAndRest(s, t(i * 120));
    expect(s.phase).toEqual({ name: 'logging' });
    expect(s.setIndex).toBe(10);
  });

  it('an exercise can join mid-session and becomes current', () => {
    let s = logAndRest(startSession('freestyle', [open]), t(0));
    s = reduce(s, {
      type: 'exerciseAdded',
      exercise: { ...curl, prescribedSets: null },
      at: t(150),
    });
    expect(s.exerciseIndex).toBe(1);
    expect(s.setIndex).toBe(0);
    expect(s.phase).toEqual({ name: 'logging' });
  });

  it('plan sessions refuse mid-session additions', () => {
    const s = startSession('plan', [squat]);
    expect(reduce(s, { type: 'exerciseAdded', exercise: curl, at: t(0) })).toBe(s);
  });

  it('ending a freestyle is never "early" — there was no prescription to miss', () => {
    const s = reduce(logAndRest(startSession('freestyle', [open]), t(0)), {
      type: 'workoutEnded',
      at: t(200),
    });
    expect(s.phase).toEqual({ name: 'done', endedEarly: false });
  });
});

describe('ending', () => {
  it('ending mid-plan is ended-early, and an open rest gets closed', () => {
    const resting = reduce(startSession('plan', [squat, curl]), {
      type: 'setLogged',
      reps: 5,
      at: t(0),
    });
    const s = reduce(resting, { type: 'workoutEnded', at: t(45) });
    expect(s.phase).toEqual({ name: 'done', endedEarly: true });
    expect(s.sets[0].restEndedAt).toBe(t(45));
  });

  it('a done session ignores everything after', () => {
    const done = reduce(startSession('plan', [squat]), { type: 'workoutEnded', at: t(0) });
    expect(reduce(done, { type: 'setLogged', reps: 5, at: t(10) })).toBe(done);
  });
});

describe('purity', () => {
  it('never mutates the input state', () => {
    const s0 = startSession('plan', [squat, curl]);
    const frozen = JSON.parse(JSON.stringify(s0));
    reduce(s0, { type: 'setLogged', reps: 5, at: t(0) });
    reduce(s0, { type: 'weightEditOpened' });
    expect(s0).toEqual(frozen);
  });
});

describe('Skip Set (watch Actions panel) — move on without logging', () => {
  it('skips to the next set of the same lift: nothing logged, no rest', () => {
    const s = reduce(startSession('plan', [squat, curl]), { type: 'setSkipped', at: t(0) });
    expect(s.sets).toHaveLength(0);
    expect(s.setIndex).toBe(1);
    expect(s.phase).toEqual({ name: 'logging' });
  });

  it('skipping the last set of a lift moves to the next lift, and the lift stays short', () => {
    let s = logAndRest(startSession('plan', [squat, curl]), t(0));
    s = reduce(s, { type: 'setSkipped', at: t(100) });
    expect(s.exerciseIndex).toBe(1);
    expect(s.setIndex).toBe(0);
    expect(s.sets.filter((x) => x.exerciseIndex === 0)).toHaveLength(1);
  });

  it("a skip during a rest changes nothing — Continue is the rest's own skip", () => {
    const resting = reduce(startSession('plan', [squat, curl]), {
      type: 'setLogged',
      reps: 5,
      at: t(0),
    });
    expect(reduce(resting, { type: 'setSkipped', at: t(1) })).toBe(resting);
  });

  it('a skipped set can never auto-finish the workout: the last log still asks for it', () => {
    let s = logAndRest(startSession('plan', [squat, curl]), t(0)); // squat 1/2
    s = reduce(s, { type: 'setSkipped', at: t(100) }); // squat 2/2 skipped → curl
    s = reduce(s, { type: 'setLogged', reps: 10, at: t(200) }); // curl 1/1
    // The squat is short a set, so the day is not done — the loop comes back to it.
    expect(s.phase.name).toBe('resting');
    s = reduce(s, { type: 'restEnded', reason: 'timer', at: t(260) });
    expect(s.exerciseIndex).toBe(0);
    expect(s.setIndex).toBe(1);
  });
});
