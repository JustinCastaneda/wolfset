import type { ActivePlan } from '@/lib/db/plan-store';

// Next Workout on the watch's opening tiles (Figma 123:3440) asks the phone to start —
// the same thing as the hub's arrow on the Up Next day. The phone decides, as always:
// nothing starts from a screen that is already the session (the watch shows the tiles
// while the poke grid is up), and nothing starts without a plan day to run (the session
// itself would only turn straight back).

export function watchStartOpensSession(pathname: string, plan: ActivePlan | null): boolean {
  if (pathname === '/session') return false;
  return (plan?.days ?? []).some((day) => day.isNext && day.exercises.length > 0);
}
