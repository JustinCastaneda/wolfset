// What the Day Overview's one big button does (Figma 34:778). A workout under way
// resumes from its own day; from any other day it can still be replaced — the button
// stays red and a drawer warns first (Justin, 2026-09-04: never a dead end). Pure — tested.

export type StartAction =
  /** No lifts on this day: nothing to run. */
  | { kind: 'none' }
  /** Nothing under way: this day becomes the rotation's next and starts. */
  | { kind: 'start' }
  /** This day is the one under way: pick it back up. */
  | { kind: 'resume' }
  /** Another day is under way: end it (early, failures) and start this one, after asking. */
  | { kind: 'replace'; inProgressName: string };

export function startAction(day: {
  exerciseCount: number;
  isNext: boolean;
  /** The name of the day a workout is under way on, or null when nothing is running. */
  inProgressName: string | null;
}): StartAction {
  if (day.exerciseCount === 0) return { kind: 'none' };
  if (day.inProgressName === null) return { kind: 'start' };
  if (day.isNext) return { kind: 'resume' };
  return { kind: 'replace', inProgressName: day.inProgressName };
}

/** The button's label for each action. */
export function startLabel(action: StartAction): string {
  return action.kind === 'resume' ? 'Resume Workout' : 'Start Workout';
}
