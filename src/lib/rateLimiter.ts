export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function createRateLimiter(maxRequests = 12, windowMs = 60_000) {
  const buckets = new Map<string, number[]>();

  return {
    check(key: string, now = Date.now()): RateLimitDecision {
      const cutoff = now - windowMs;
      const recent = (buckets.get(key) ?? []).filter(ts => ts > cutoff);

      if (recent.length >= maxRequests) {
        const retryAfterMs = Math.max(1, recent[0] + windowMs - now);
        buckets.set(key, recent);
        return {
          allowed:false,
          remaining:0,
          retryAfterSeconds:Math.ceil(retryAfterMs / 1000),
        };
      }

      recent.push(now);
      buckets.set(key, recent);

      if (buckets.size > 2_000) {
        for (const [bucketKey, timestamps] of buckets) {
          if (!timestamps.some(ts => ts > cutoff)) buckets.delete(bucketKey);
          if (buckets.size <= 1_500) break;
        }
      }

      return {
        allowed:true,
        remaining:Math.max(0, maxRequests - recent.length),
        retryAfterSeconds:0,
      };
    },
  };
}
