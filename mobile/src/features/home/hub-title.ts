// The hub's greeting (Figma 34:1464 reads "Change It Up"; Justin, 2026-09-04: rotate a
// few encouraging lines, wolf-flavoured — the pack is the audience). One line per day,
// so the title holds still while the user moves between screens; a name can join it
// once there is a profile name to show.

export const HUB_TITLES = [
  'Back at it',
  "Let's hunt",
  'Get after it',
  'Lead the pack',
  'Time to lift',
  'Earn it',
] as const;

export function hubTitle(date: Date): string {
  const startOfYear = Date.UTC(date.getFullYear(), 0, 1);
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const dayOfYear = Math.floor((today - startOfYear) / 86_400_000);
  return HUB_TITLES[dayOfYear % HUB_TITLES.length];
}
