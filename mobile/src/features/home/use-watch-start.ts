import { router, usePathname } from 'expo-router';
import { useEffect } from 'react';

import { onWatchAction } from '@/features/hr/watch-control';
import { loadActivePlan } from '@/lib/db/plan-store';
import { watchStartOpensSession } from './watch-start';

/** Listens, app-wide, for Next Workout on the watch and opens the session — the plan's
 *  rotation already points at the day to run, exactly as the hub's Up Next arrow finds
 *  it. Mounted once, in the root layout, so a wrist tap works from any screen. */
export function useWatchStart() {
  const pathname = usePathname();
  useEffect(
    () =>
      onWatchAction((action) => {
        if (action.type !== 'startWorkout') return;
        if (watchStartOpensSession(pathname, loadActivePlan())) router.push('/session');
      }),
    [pathname],
  );
}
