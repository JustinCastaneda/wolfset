import { describe, expect, it, jest } from '@jest/globals';
import { WolfsetHr } from '@modules/wolfset-hr';

import { reachFrom, startWatch, stopWatch } from './watch-control';

jest.mock('@modules/wolfset-hr', () => ({
  WolfsetHr: { startWatchStream: jest.fn(), stopWatchStream: jest.fn() },
}));

const native = WolfsetHr as unknown as {
  startWatchStream: jest.Mock<() => Promise<number>>;
  stopWatchStream: jest.Mock<() => Promise<number>>;
};

describe('the session driving the watch', () => {
  it('reads the module answer: reached, no watch, or unavailable', () => {
    expect(reachFrom(1)).toBe('reached');
    expect(reachFrom(2)).toBe('reached');
    expect(reachFrom(0)).toBe('no-watch');
    expect(reachFrom(null)).toBe('unavailable');
  });

  it('start and stop each send their own command', async () => {
    native.startWatchStream.mockResolvedValueOnce(1);
    native.stopWatchStream.mockResolvedValueOnce(0);
    await expect(startWatch()).resolves.toBe('reached');
    await expect(stopWatch()).resolves.toBe('no-watch');
    expect(native.startWatchStream).toHaveBeenCalledTimes(1);
    expect(native.stopWatchStream).toHaveBeenCalledTimes(1);
  });

  it('a phone without Wearable support never throws into the session', async () => {
    native.startWatchStream.mockRejectedValueOnce(new Error('Wearable API unavailable'));
    await expect(startWatch()).resolves.toBe('unavailable');
  });
});
