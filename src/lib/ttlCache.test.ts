import { describe, expect, it, vi } from 'vitest';
import { createTtlCache } from './ttlCache';

describe('ttl cache', () => {
  it('reuses a fresh value', async () => {
    const cache = createTtlCache<number>(1000);
    const loader = vi.fn(async () => 42);

    expect(await cache.getOrLoad('x', loader, 1000)).toBe(42);
    expect(await cache.getOrLoad('x', loader, 1500)).toBe(42);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('reloads after expiry', async () => {
    const cache = createTtlCache<number>(1000);
    let value = 1;
    const loader = vi.fn(async () => value++);

    expect(await cache.getOrLoad('x', loader, 1000)).toBe(1);
    expect(await cache.getOrLoad('x', loader, 2001)).toBe(2);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('does not cache failed loads', async () => {
    const cache = createTtlCache<number>(1000);
    const loader = vi.fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(7);

    await expect(cache.getOrLoad('x', loader, 1000)).rejects.toThrow('boom');
    await expect(cache.getOrLoad('x', loader, 1100)).resolves.toBe(7);
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
