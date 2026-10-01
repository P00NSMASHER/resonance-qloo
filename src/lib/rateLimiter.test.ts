import { describe, expect, it } from 'vitest';
import { createRateLimiter } from './rateLimiter';

describe('rate limiter', () => {
  it('allows a bounded number of requests in the window', () => {
    const limiter = createRateLimiter(2, 1000);
    expect(limiter.check('a', 1000)).toMatchObject({allowed:true,remaining:1});
    expect(limiter.check('a', 1100)).toMatchObject({allowed:true,remaining:0});
    const denied = limiter.check('a', 1200);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterSeconds).toBe(1);
  });

  it('opens again after the window expires', () => {
    const limiter = createRateLimiter(1, 1000);
    expect(limiter.check('a', 1000).allowed).toBe(true);
    expect(limiter.check('a', 1500).allowed).toBe(false);
    expect(limiter.check('a', 2001).allowed).toBe(true);
  });

  it('keeps callers isolated', () => {
    const limiter = createRateLimiter(1, 1000);
    expect(limiter.check('a', 1000).allowed).toBe(true);
    expect(limiter.check('b', 1000).allowed).toBe(true);
  });
});
