import { router, usePathname } from 'expo-router';
import { useEffect } from 'react';

import { onWatchAction } from '@/features/hr/watch-control';
import { session } from '@/features/set-loop/session-controller';

/** Next Workout on the watch opens the session screen — from any screen, so the phone
 *  is on the workout when it comes out of the pocket. Starting the session itself is the
 *  entry's listener (session-controller.ts, installed before any screen exists and so
 *  before this one), which is why by the time this runs the session is live. Mounted once,
 *  in the root layout. */
export function useWatchStart() {
  const pathname = usePathname();
  useEffect(
    () =>
      onWatchAction((action) => {
        if (action.type !== 'startWorkout' || pathname === '/session') return;
        if (session.get()) router.push('/session');
      }),
    [pathname],
  );
}
