/**
 * In-memory fixed-window limiter for the auth endpoints. Good enough for a single
 * Node process; put a shared store (Redis) behind this if the app is scaled out.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const globalForLimiter = globalThis as unknown as { __evappBuckets?: Map<string, Bucket> };
const buckets: Map<string, Bucket> = (globalForLimiter.__evappBuckets ??= new Map());

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { ok: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

/** Best-effort client address behind a reverse proxy. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

// Opportunistic cleanup so the map cannot grow forever in a long-running process.
if (!(globalThis as { __evappBucketSweeper?: boolean }).__evappBucketSweeper) {
  (globalThis as { __evappBucketSweeper?: boolean }).__evappBucketSweeper = true;
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
  }, 60_000).unref?.();
}
