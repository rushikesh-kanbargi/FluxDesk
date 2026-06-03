/**
 * Rate limiter — async interface.
 *
 * When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set, uses
 * @upstash/ratelimit (sliding window, distributed-safe for Vercel serverless).
 *
 * Without those env vars, falls back to the in-memory sliding-window tracker.
 * The fallback is intentionally simple: it resets on cold start. This is
 * acceptable because the per-user DB guard (demoService) is the real backstop.
 */

let upstashLimiter: ((key: string, max: number, windowMs: number) => Promise<{ allowed: boolean; retryAfterSec: number }>) | null = null

async function getUpstashLimiter() {
  if (upstashLimiter) return upstashLimiter
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null

  const { Ratelimit } = await import('@upstash/ratelimit')
  const { Redis } = await import('@upstash/redis')

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })

  // Cache one limiter factory — the per-call window/max are encoded in the key prefix.
  upstashLimiter = async (key: string, max: number, windowMs: number) => {
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(max, `${windowMs} ms`),
      prefix: 'rl',
    })
    const { success, reset } = await limiter.limit(key)
    const retryAfterSec = success ? 0 : Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    return { allowed: success, retryAfterSec }
  }

  return upstashLimiter
}

// ── In-memory fallback ─────────────────────────────────────────────────────
const counts = new Map<string, { count: number; resetAt: number }>()

function checkInMemory(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now()
  const entry = counts.get(key)
  if (!entry || now > entry.resetAt) {
    counts.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterSec: 0 }
  }
  if (entry.count >= maxRequests) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, retryAfterSec }
  }
  entry.count++
  return { allowed: true, retryAfterSec: 0 }
}

// ── Public API ─────────────────────────────────────────────────────────────
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const limiter = await getUpstashLimiter()
  if (limiter) return limiter(key, maxRequests, windowMs)
  return checkInMemory(key, maxRequests, windowMs)
}
