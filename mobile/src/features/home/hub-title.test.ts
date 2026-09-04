import { describe, expect, it } from '@jest/globals';

import { HUB_TITLES, hubTitle } from './hub-title';

describe('the hub title', () => {
  it('is one of the encouraging lines', () => {
    expect(HUB_TITLES).toContain(hubTitle(new Date(2026, 8, 4)));
  });

  it('holds still for a whole day, whatever the hour', () => {
    expect(hubTitle(new Date(2026, 8, 4, 6, 15))).toBe(hubTitle(new Date(2026, 8, 4, 22, 40)));
  });

  it('rotates from one day to the next and comes back around', () => {
    const first = hubTitle(new Date(2026, 8, 4));
    expect(hubTitle(new Date(2026, 8, 5))).not.toBe(first);
    expect(hubTitle(new Date(2026, 8, 4 + HUB_TITLES.length))).toBe(first);
  });
});
