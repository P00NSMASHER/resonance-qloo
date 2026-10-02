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

  it('starts TTL when a slow loader completes', async () => {
    let now = 1000;
    const cache = createTtlCache<number>(1000, 250, () => now);
    const loader = vi.fn(async () => {
      now = 1800;
      return 42;
    });

    expect(await cache.getOrLoad('x', loader)).toBe(42);
    expect(cache.get('x', 2500)).toBe(42);
    expect(cache.get('x', 2800)).toBeUndefined();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('coalesces concurrent loads for the same key', async () => {
    const cache = createTtlCache<number>(1000);
    let release: ((value: number) => void) | undefined;
    const loader = vi.fn(() => new Promise<number>(resolve => { release = resolve; }));

    const first = cache.getOrLoad('x', loader, 1000);
    const second = cache.getOrLoad('x', loader, 1000);

    expect(loader).toHaveBeenCalledTimes(1);
    release?.(42);

    await expect(first).resolves.toBe(42);
    await expect(second).resolves.toBe(42);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('clears a failed in-flight load so a later call can retry', async () => {
    const cache = createTtlCache<number>(1000);
    let rejectFirst: ((reason?: unknown) => void) | undefined;
    const loader = vi.fn()
      .mockImplementationOnce(() => new Promise<number>((_resolve, reject) => { rejectFirst = reject; }))
      .mockResolvedValueOnce(7);

    const first = cache.getOrLoad('x', loader, 1000);
    const second = cache.getOrLoad('x', loader, 1000);
    expect(loader).toHaveBeenCalledTimes(1);

    rejectFirst?.(new Error('boom'));
    await expect(first).rejects.toThrow('boom');
    await expect(second).rejects.toThrow('boom');

    await expect(cache.getOrLoad('x', loader, 1100)).resolves.toBe(7);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('supports targeted invalidation without clearing unrelated keys', async () => {
    const cache = createTtlCache<number>(1000);
    cache.set('x', 1, 1000);
    cache.set('y', 2, 1000);

    cache.delete('x');

    expect(cache.get('x', 1100)).toBeUndefined();
    expect(cache.get('y', 1100)).toBe(2);
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
