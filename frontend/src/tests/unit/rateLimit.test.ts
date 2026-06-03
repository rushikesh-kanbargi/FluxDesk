/**
 * Rate limiter tests.
 * After the C2 fix, checkRateLimit is async (Upstash-backed when configured,
 * in-memory otherwise). These tests run against the in-memory fallback because
 * UPSTASH_REDIS_REST_URL is not set in the test environment.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkRateLimit } from '@/lib/server/rateLimit'

describe('checkRateLimit (in-memory fallback)', () => {
  // Each test gets a unique key so window state doesn't bleed between tests
  const key = (label: string) => `test:${label}:${Math.random().toString(36).slice(2)}`

  it('allows the first request', async () => {
    const result = await checkRateLimit(key('first'), 5, 60_000)
    expect(result.allowed).toBe(true)
    expect(result.retryAfterSec).toBe(0)
  })

  it('allows requests up to the limit', async () => {
    const k = key('up-to-limit')
    for (let i = 0; i < 3; i++) {
      const r = await checkRateLimit(k, 3, 60_000)
      expect(r.allowed).toBe(true)
    }
  })

  it('blocks the request that exceeds the limit', async () => {
    const k = key('exceed')
    for (let i = 0; i < 3; i++) await checkRateLimit(k, 3, 60_000)
    const r = await checkRateLimit(k, 3, 60_000)
    expect(r.allowed).toBe(false)
    expect(r.retryAfterSec).toBeGreaterThan(0)
  })

  it('different keys are tracked independently', async () => {
    const k1 = key('ind-a')
    const k2 = key('ind-b')
    for (let i = 0; i < 3; i++) await checkRateLimit(k1, 3, 60_000)
    // k1 exhausted but k2 should still be free
    const r = await checkRateLimit(k2, 3, 60_000)
    expect(r.allowed).toBe(true)
  })

  it('resets after the window expires', async () => {
    const k = key('window-reset')
    for (let i = 0; i < 2; i++) await checkRateLimit(k, 2, 10)   // 10ms window
    await new Promise(r => setTimeout(r, 20))                       // wait for expiry
    const r = await checkRateLimit(k, 2, 10)
    expect(r.allowed).toBe(true)
  })

  it('returns a positive retryAfterSec when blocked', async () => {
    const k = key('retry-after')
    for (let i = 0; i < 2; i++) await checkRateLimit(k, 2, 60_000)
    const r = await checkRateLimit(k, 2, 60_000)
    expect(r.retryAfterSec).toBeGreaterThanOrEqual(1)
  })
})
