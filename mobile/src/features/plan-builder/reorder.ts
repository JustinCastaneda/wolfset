// Reordering rows by drag (Day Summary's edit state). Pure — tested.

/** Where a row dragged `dy` pixels from index `from` lands, in a list of `count` rows
 *  of one height: the nearest slot, clamped to the list. */
export function dropIndex(from: number, dy: number, rowHeight: number, count: number): number {
  const target = from + Math.round(dy / rowHeight);
  return Math.min(count - 1, Math.max(0, target));
}

/** The list with one item moved — same array when nothing moves. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length)
    return [...items];
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Search Exercise copy (Figma 101:814 draws the first lift; the follow-ups are mine). */
export function searchCopy(
  dayName: string,
  liftsSoFar: number,
): { title: string; subtitle: string } {
  if (liftsSoFar === 0)
    return { title: 'What’s the first lift?', subtitle: `This starts ${dayName}. Add more after.` };
  return { title: 'What’s the next lift?', subtitle: `Goes at the end of ${dayName}.` };
}
