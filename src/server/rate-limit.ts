/**
 * Simple in-memory sliding-window rate limiter.
 * Good for a single Node process (MVP / VPS). For multi-instance deployments swap the store
 * for Redis/Upstash behind the same `rateLimit` signature.
 */
type Bucket = number[];
const store = new Map<string, Bucket>();
let lastSweep = Date.now();

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterMs: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  if (now - lastSweep > 60_000) {
    for (const [k, hits] of store) if (!hits.length || hits[hits.length - 1] < now - 10 * 60_000) store.delete(k);
    lastSweep = now;
  }
  const hits = (store.get(key) ?? []).filter((t) => t > now - windowMs);
  if (hits.length >= limit) {
    store.set(key, hits);
    return { ok: false, remaining: 0, retryAfterMs: hits[0] + windowMs - now };
  }
  hits.push(now);
  store.set(key, hits);
  return { ok: true, remaining: limit - hits.length, retryAfterMs: 0 };
}

export function resetRateLimit(key: string) {
  store.delete(key);
}
