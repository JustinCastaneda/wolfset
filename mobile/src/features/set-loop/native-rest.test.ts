import { describe, expect, it } from '@jest/globals';

import { restEndedMatches, restEndsAt } from './native-rest';

describe('the native rest timer (JS side)', () => {
  it('a rest ends startedAt + restSeconds, in wall-clock ms', () => {
    expect(
      restEndsAt({ name: 'resting', startedAt: 10_000, restSeconds: 90, recovered: false }),
    ).toBe(100_000);
    expect(restEndsAt({ name: 'logging' })).toBeNull();
    expect(restEndsAt({ name: 'done', endedEarly: false })).toBeNull();
  });

  it('a late "rest over" from an earlier rest never ends the current one', () => {
    const event = { at: 100_500, endsAt: 100_000 };
    expect(restEndedMatches(event, 100_000)).toBe(true);
    expect(restEndedMatches(event, 250_000)).toBe(false);
    expect(restEndedMatches(event, null)).toBe(false);
  });
});
