// The Suggested Week on Plan Summary (Figma 123:2530) and the home hub (34:1464): three
// sessions a week — Mon, Wed, Fri — cycling through the plan's days by letter. Two days →
// A B A; three → A B C; one → A A A. A suggestion only; nothing is scheduled yet. Pure —
// tested. Lives in lib/ because two features read it (conventions §1).

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const SESSION_DAYS = [0, 2, 4]; // Mon Wed Fri

export function dayLetter(order: number): string {
  return String.fromCharCode(65 + (order % 26));
}

/** One entry per weekday: the day letter to train, or null to rest. */
export function suggestedWeek(dayCount: number): (string | null)[] {
  if (dayCount <= 0) return WEEKDAYS.map(() => null);
  let next = 0;
  return WEEKDAYS.map((_, i) => {
    if (!SESSION_DAYS.includes(i)) return null;
    const letter = dayLetter(next % dayCount);
    next += 1;
    return letter;
  });
}

/** "Reps First • 2 Days • 6 Exercises" */
export function planSubtitle(
  strategyLabel: string,
  dayCount: number,
  exerciseCount: number,
): string {
  const days = `${dayCount} ${dayCount === 1 ? 'Day' : 'Days'}`;
  const lifts = `${exerciseCount} ${exerciseCount === 1 ? 'Exercise' : 'Exercises'}`;
  return `${strategyLabel} • ${days} • ${lifts}`;
}
