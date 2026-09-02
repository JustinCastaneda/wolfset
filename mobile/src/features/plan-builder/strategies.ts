import type { ProgressionStrategy } from '@/lib/db/plan-store';

// The three "How You Get Stronger" cards (Figma 101:994; strategy rows 380:8548 /
// 380:9747), copy verbatim. Steady is the default (decision #11: progressive overload
// is what most people mean by "get stronger").

export const STRATEGIES: { id: ProgressionStrategy; title: string; description: string }[] = [
  {
    id: 'steady',
    title: 'Steady',
    description:
      'Hit all of your reps and the next set will add 5lbs. Miss twice, and we’ll drop 10%',
  },
  {
    id: 'reps-first',
    title: 'Reps First',
    description: 'Climb from 8 to 12 reps at the same weight, then add 5lbs and start over at 8',
  },
  {
    id: 'by-feel',
    title: 'By Feel',
    description: 'Decide after each set. We’ll make suggestions but the choice is up to you',
  },
];

export const DEFAULT_STRATEGY: ProgressionStrategy = 'steady';
