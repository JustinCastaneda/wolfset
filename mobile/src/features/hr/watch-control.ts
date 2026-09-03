import { WolfsetHr, type WatchAction } from '@modules/wolfset-hr';

// The session drives the watch: Start Workout starts the stream, the end of the session
// stops it — nobody taps the watch (decision 2026-09-03). The session also shows itself
// on the wrist (the watch's Set and Timer screens) and takes Log and Continue taps back.
// A phone with no module, no Wearable support, or no watch connected simply gets no
// signal; the timer falls back to time alone (PostSetTimerScreen), so nothing here may
// throw into the session.

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

/** Put the session's view on the watch (JSON from watch-view.ts). No module: no-op. */
export function showOnWatch(viewJson: string) {
  WolfsetHr?.publishWatchView(viewJson);
}

/** Subscribe to taps on the watch; returns the unsubscribe. No module: no-op. */
export function onWatchAction(handler: (action: WatchAction) => void): () => void {
  const native = WolfsetHr;
  if (!native) return () => {};
  const sub = native.addListener('onWatchAction', handler);
  return () => sub.remove();
}
