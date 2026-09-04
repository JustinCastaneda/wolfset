import type { Phase, SessionEvent, SessionExercise, SessionState } from './types';

// The set-loop reducer (handoff brief §01). Pure: reduce(state, event) → state.
// The transitions, verbatim from the brief:
//   Log a Set → Post Set Timer          the timer starts on its own after a log
//   Post Set Timer → Log a Set          0:00 or Continue — two triggers, one destination
//   sets exhausted → next lift          same screens, new exercise
//   last lift done → (all-sets-done)    Workout Summary is navigation, not a phase
//   Finish → Session Done               workoutEnded, from anywhere
//   Log a Set ↔ Edit Weights            a detour, not a step

export function startSession(
  kind: SessionState['kind'],
  exercises: SessionExercise[],
): SessionState {
  if (exercises.length === 0) throw new Error('a session needs at least one exercise');
  return {
    kind,
    exercises,
    exerciseIndex: 0,
    setIndex: 0,
    sets: [],
    phase: { name: 'logging' },
    pendingRatings: [],
    feelRatings: {},
  };
}

export function reduce(state: SessionState, event: SessionEvent): SessionState {
  // The poke grid may still be answering after the final set auto-finished.
  if (state.phase.name === 'done' && event.type !== 'feelRated') return state;

  switch (event.type) {
    case 'setLogged': {
      if (state.phase.name !== 'logging' && state.phase.name !== 'all-sets-done') return state;
      const exercise = current(state);
      // The last rep of the last prescribed set ends the workout on its own — they did
      // it; no rest, straight to Session Done (Justin, 2026-09-02).
      const finishes =
        state.kind === 'plan' &&
        state.exercises.every((ex, i) => {
          if (ex.prescribedSets === null) return false;
          const logged = countLogged(state, i) + (i === state.exerciseIndex ? 1 : 0);
          return logged >= ex.prescribedSets;
        });
      const sets = [
        ...state.sets,
        {
          exerciseIndex: state.exerciseIndex,
          setIndex: state.setIndex,
          weight: exercise.weight,
          reps: event.reps,
          loggedAt: event.at,
          restStartedAt: !finishes && exercise.autoStartTimer ? event.at : null,
          restEndedAt: null,
          restEndReason: null,
        },
      ];
      // A by-feel lift completing its prescription queues the poke grid ("How was
      // it?"), even when that same log auto-finishes the workout.
      const completedByFeel =
        exercise.strategy === 'by-feel' &&
        exercise.prescribedSets !== null &&
        countLogged(state, state.exerciseIndex) + 1 >= exercise.prescribedSets &&
        !state.pendingRatings.includes(state.exerciseIndex);
      const pendingRatings = completedByFeel
        ? [...state.pendingRatings, state.exerciseIndex]
        : state.pendingRatings;
      if (finishes)
        return { ...state, sets, pendingRatings, phase: { name: 'done', endedEarly: false } };
      // The timer starts on its own; it is not a screen the user chooses to visit.
      const phase: Phase = {
        name: 'resting',
        startedAt: event.at,
        restSeconds: exercise.restSeconds,
        recovered: false,
      };
      return { ...state, sets, pendingRatings, phase };
    }

    case 'feelRated': {
      if (!state.pendingRatings.includes(event.exerciseIndex)) return state;
      return {
        ...state,
        pendingRatings: state.pendingRatings.filter((i) => i !== event.exerciseIndex),
        feelRatings: { ...state.feelRatings, [event.exerciseIndex]: event.rating },
      };
    }

    case 'restEnded': {
      if (state.phase.name !== 'resting') return state;
      const sets = closeRest(state, event.reason, event.at);
      return advance({ ...state, sets });
    }

    case 'recoveredChanged': {
      if (state.phase.name !== 'resting') return state;
      return { ...state, phase: { ...state.phase, recovered: event.recovered } };
    }

    case 'weightEditOpened': {
      if (state.phase.name !== 'logging' && state.phase.name !== 'all-sets-done') return state;
      return { ...state, phase: { name: 'editing-weight' } };
    }

    case 'weightSaved': {
      if (state.phase.name !== 'editing-weight') return state;
      // "Applies to future sets and workouts" — the current exercise's fill changes.
      const exercises = state.exercises.map((ex, i) =>
        i === state.exerciseIndex ? { ...ex, weight: event.weight } : ex,
      );
      return { ...state, exercises, phase: { name: 'logging' } };
    }

    case 'weightEditClosed': {
      if (state.phase.name !== 'editing-weight') return state;
      return { ...state, phase: { name: 'logging' } };
    }

    case 'exerciseAdded': {
      if (state.kind !== 'freestyle') return state;
      const exercises = [...state.exercises, event.exercise];
      // Cut any running rest short and move to the new exercise.
      const sets =
        state.phase.name === 'resting' ? closeRest(state, 'continue', event.at) : state.sets;
      return {
        ...state,
        exercises,
        sets,
        exerciseIndex: exercises.length - 1,
        setIndex: 0,
        phase: { name: 'logging' },
      };
    }

    case 'exerciseJumped': {
      if (event.index < 0 || event.index >= state.exercises.length) return state;
      const sets =
        state.phase.name === 'resting' ? closeRest(state, 'continue', event.at) : state.sets;
      const jumped = { ...state, sets, exerciseIndex: event.index };
      return { ...jumped, setIndex: countLogged(jumped, event.index), phase: { name: 'logging' } };
    }

    case 'setSkipped': {
      if (state.phase.name !== 'logging' && state.phase.name !== 'all-sets-done') return state;
      // Same step as the end of a rest, minus the set: the next set of this lift, or the
      // next unfinished lift. The skipped set is simply never logged, so scoring counts
      // the lift short (a failure), and the day's total stays honest.
      return advance(state);
    }

    case 'workoutEnded': {
      const sets =
        state.phase.name === 'resting' ? closeRest(state, 'continue', event.at) : state.sets;
      // Ending with prescribed work left is ending early — a failure for the unfinished
      // exercises, not a miss (data-model §5.1). Scoring happens outside the machine.
      const endedEarly = state.phase.name !== 'all-sets-done' && state.kind === 'plan';
      return { ...state, sets, phase: { name: 'done', endedEarly } };
    }
  }
}

/** Seconds left on the rest timer; the caller supplies now (injectable clock). */
export function restRemaining(state: SessionState, now: number): number | null {
  if (state.phase.name !== 'resting') return null;
  const elapsed = (now - state.phase.startedAt) / 1000;
  return Math.max(0, state.phase.restSeconds - elapsed);
}

function current(state: SessionState): SessionExercise {
  return state.exercises[state.exerciseIndex];
}

function closeRest(state: SessionState, reason: 'timer' | 'continue', at: number) {
  const last = state.sets.length - 1;
  return state.sets.map((s, i) =>
    i === last ? { ...s, restEndedAt: at, restEndReason: reason } : s,
  );
}

function countLogged(state: SessionState, exerciseIndex: number): number {
  return state.sets.filter((s) => s.exerciseIndex === exerciseIndex).length;
}

/** After a rest: next set of the same exercise, or the next *unfinished* lift — the
 *  search wraps, because jumping around can leave earlier lifts incomplete. */
function advance(state: SessionState): SessionState {
  const exercise = current(state);
  const nextSet = state.setIndex + 1;

  // Freestyle sets are open-ended — "sets exhausted" has no meaning there (brief §01).
  if (exercise.prescribedSets === null || nextSet < exercise.prescribedSets) {
    return { ...state, setIndex: nextSet, phase: { name: 'logging' } };
  }

  const count = state.exercises.length;
  for (let step = 1; step < count; step++) {
    const i = (state.exerciseIndex + step) % count;
    const prescribed = state.exercises[i].prescribedSets;
    const logged = countLogged(state, i);
    if (prescribed === null || logged < prescribed) {
      return { ...state, exerciseIndex: i, setIndex: logged, phase: { name: 'logging' } };
    }
  }

  // Belt only: plans auto-finish on the final logged set, so this is unreachable there.
  return { ...state, phase: { name: 'all-sets-done' } };
}
