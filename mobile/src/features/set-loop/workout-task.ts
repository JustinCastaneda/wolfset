import { releaseWorkout } from './native-rest';
import { session } from './session-controller';

// The headless task behind the workout's foreground service (WorkoutService in the
// native module). Two jobs, both small: start or resume the session when the watch asked
// for one and no screen was up to do it — with the app dead, this is the first JavaScript
// that runs — and then stay pending until the session closes, because a running headless
// task is what keeps React's timers alive while the app is off screen. Registered under
// the service's task key in mobile/index.ts.

export const WORKOUT_TASK = 'WolfsetWorkout';

export async function runWorkoutTask(data: { watchAction?: string | null }): Promise<void> {
  if (data.watchAction === 'startWorkout') session.start(Date.now(), 'headless');
  if (!session.get()) {
    // Nothing to run (no plan day) or nothing was asked: the service needs no holding.
    releaseWorkout();
    return;
  }
  await session.closed();
}
