interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

/**
 * Shared in-memory rate limiter for the handful of routes that need a tighter limit than
 * the global `elysia-rate-limit` in index.ts (auth, guest slip upload, transcription).
 *
 * ponytail: fixed window, not a true sliding log — a caller can burst up to ~2x `max`
 * across a window boundary. Fine for abuse mitigation on low-traffic routes; upgrade to a
 * real sliding window if that gap gets exploited.
 *
 * ponytail: in-memory, per-instance — resets on deploy/restart and doesn't share state
 * across Fly machines. Same single-instance scope as the global limiter; move both to
 * Redis together if we ever run more than one API instance.
 */
export function hitRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (bucket.count >= max) return false
  bucket.count += 1
  return true
}

setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key)
  }
}, 10 * 60_000).unref()

export function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for') ?? request.headers.get('cf-connecting-ip') ?? 'unknown'
}
