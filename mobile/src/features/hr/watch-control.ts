import { WolfsetHr } from '@modules/wolfset-hr';

// The session drives the watch: Start Workout starts the stream, the end of the session
// stops it — nobody taps the watch (decision 2026-09-03). A phone with no module, no
// Wearable support, or no watch connected simply gets no signal; the timer falls back to
// time alone (PostSetTimerScreen), so nothing here may throw into the session.

export type WatchReach = 'reached' | 'no-watch' | 'unavailable';

/** Pure: what a start/stop attempt meant, from the module's answer. */
export function reachFrom(result: number | null): WatchReach {
  if (result === null) return 'unavailable';
  return result > 0 ? 'reached' : 'no-watch';
}

async function control(command: 'start' | 'stop'): Promise<WatchReach> {
  const native = WolfsetHr;
  if (!native) return 'unavailable';
  try {
    const reached =
      command === 'start' ? await native.startWatchStream() : await native.stopWatchStream();
    return reachFrom(reached);
  } catch {
    return 'unavailable';
  }
}

export const startWatch = () => control('start');
export const stopWatch = () => control('stop');
