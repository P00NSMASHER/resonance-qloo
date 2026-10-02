type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export function createTtlCache<T>(
  ttlMs: number,
  maxEntries = 250,
  clock: () => number = Date.now,
) {
  const entries = new Map<string, CacheEntry<T>>();
  const inFlight = new Map<string, Promise<T>>();

  return {
    get(key: string, now = clock()): T | undefined {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= now) {
        entries.delete(key);
        return undefined;
      }
      return entry.value;
    },

    set(key: string, value: T, now = clock()) {
      if (entries.size >= maxEntries && !entries.has(key)) {
        const oldestKey = entries.keys().next().value as string | undefined;
        if (oldestKey) entries.delete(oldestKey);
      }
      entries.set(key, { value, expiresAt: now + ttlMs });
    },

    async getOrLoad(key: string, loader: () => Promise<T>, now?: number) {
      const lookupNow = now ?? clock();
      const cached = this.get(key, lookupNow);
      if (cached !== undefined) return cached;

      const pending = inFlight.get(key);
      if (pending) return pending;

      const load = (async () => {
        try {
          const value = await loader();
          this.set(key, value, now ?? clock());
          return value;
        } finally {
          inFlight.delete(key);
        }
      })();

      inFlight.set(key, load);
      return load;
    },

    delete(key: string) {
      entries.delete(key);
    },

    size() {
      return entries.size;
    },
  };
}
