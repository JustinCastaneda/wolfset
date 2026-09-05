import { describe, expect, it } from '@jest/globals';

import { formatDiary } from './session-log';

describe('the workout diary as text', () => {
  it('stamps every entry from the start and lays the detail out as pairs', () => {
    const text = formatDiary(1_000_000, [
      { at: 1_000_000, kind: 'session', detail: { start: 'watch', day: 'Workout B' } },
      {
        at: 1_000_000 + 754_300,
        kind: 'watch',
        detail: { type: 'logSet', lag: 1200, taken: true },
      },
      { at: 1_000_000 - 500, kind: 'hr', detail: { n: 12, avg: 101.5 } },
    ]);
    const lines = text.split('\n');
    expect(lines[0]).toContain('WOLFSET workout diary');
    expect(lines[1]).toBe('3 entries; times are from the start');
    expect(lines[3]).toBe('+00:00.0  session       start=watch day=Workout B');
    expect(lines[4]).toBe('+12:34.3  watch         type=logSet lag=1200 taken=true');
    expect(lines[5]).toBe('-00:00.5  hr            n=12 avg=101.5');
  });
});
