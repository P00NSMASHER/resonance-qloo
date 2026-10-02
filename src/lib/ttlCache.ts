type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export function createTtlCache<T>(ttlMs: number, maxEntries = 250) {
  const entries = new Map<string, CacheEntry<T>>();
  const inFlight = new Map<string, Promise<T>>();

  return {
    get(key: string, now = Date.now()): T | undefined {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= now) {
        entries.delete(key);
        return undefined;
      }
      return entry.value;
    },

    set(key: string, value: T, now = Date.now()) {
      if (entries.size >= maxEntries && !entries.has(key)) {
        const oldestKey = entries.keys().next().value as string | undefined;
        if (oldestKey) entries.delete(oldestKey);
      }
      entries.set(key, { value, expiresAt: now + ttlMs });
    },

    async getOrLoad(key: string, loader: () => Promise<T>, now = Date.now()) {
      const cached = this.get(key, now);
      if (cached !== undefined) return cached;

      const existing = inFlight.get(key);
      if (existing) return existing;

      const pending = Promise.resolve()
        .then(loader)
        .then(value => {
          this.set(key, value, Date.now());
          return value;
        })
        .finally(() => {
          if (inFlight.get(key) === pending) inFlight.delete(key);
        });

      inFlight.set(key, pending);
      return pending;
    },

    size() {
      return entries.size;
    },
  };
}
