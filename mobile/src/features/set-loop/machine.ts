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
  return { kind, exercises, exerciseIndex: 0, setIndex: 0, sets: [], phase: { name: 'logging' } };
}

export function reduce(state: SessionState, event: SessionEvent): SessionState {
  if (state.phase.name === 'done') return state;

  switch (event.type) {
    case 'setLogged': {
      if (state.phase.name !== 'logging' && state.phase.name !== 'all-sets-done') return state;
      const exercise = current(state);
      const sets = [
        ...state.sets,
        {
          exerciseIndex: state.exerciseIndex,
          setIndex: state.setIndex,
          weight: exercise.weight,
          reps: event.reps,
          loggedAt: event.at,
          restStartedAt: exercise.autoStartTimer ? event.at : null,
          restEndedAt: null,
          restEndReason: null,
        },
      ];
      // The timer starts on its own; it is not a screen the user chooses to visit.
      const phase: Phase = {
        name: 'resting',
        startedAt: event.at,
        restSeconds: exercise.restSeconds,
        recovered: false,
      };
      return { ...state, sets, phase };
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

/** After a rest: next set of the same exercise, or the next lift, or all done. */
function advance(state: SessionState): SessionState {
  const exercise = current(state);
  const nextSet = state.setIndex + 1;

  // Freestyle sets are open-ended — "sets exhausted" has no meaning there (brief §01).
  if (exercise.prescribedSets === null || nextSet < exercise.prescribedSets) {
    return { ...state, setIndex: nextSet, phase: { name: 'logging' } };
  }

  const nextExercise = state.exerciseIndex + 1;
  if (nextExercise < state.exercises.length) {
    return { ...state, exerciseIndex: nextExercise, setIndex: 0, phase: { name: 'logging' } };
  }

  return { ...state, phase: { name: 'all-sets-done' } };
}
