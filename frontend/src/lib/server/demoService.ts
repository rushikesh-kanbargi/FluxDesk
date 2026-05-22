/**
 * Platform demo mode — lets new users run 5 tool calls without a BYOK API key.
 *
 * Feature flag: PLATFORM_DEMO_ENABLED=true (defaults to false — code ships dormant)
 * Platform key:  PLATFORM_OPENAI_KEY=sk-...  (gpt-4o-mini only)
 * Daily cap:     PLATFORM_DEMO_DAILY_CAP_USD=5 (default)
 *
 * Guards (checked in order):
 *   1. Feature flag enabled
 *   2. User has no own API keys (BYOK users are never in demo mode)
 *   3. Per-user hard limit: demoRunsUsed < 5 (DB-backed, atomic increment)
 *   4. Daily spend cap (in-memory — resets on cold start; Redis when needed)
 *   5. Per-IP rate limit: 10 requests per 24h (in-memory, same caveat)
 *
 * Serverless note: in-memory counters (daily spend, IP tracker) reset on cold start.
 * This is acceptable — the per-user limit (DB-backed) is the real guard.
 * The daily cap is a last-resort budget kill switch, not a precision counter.
 * Replace with Redis when multi-instance spend tracking is required.
 */
import { prisma } from './prisma'
import { getUserApiKeys } from './aiService'
import type { AIProvider } from './aiService'

export const DEMO_RUNS_MAX = 5
const DEMO_PROVIDER: AIProvider = 'OPENAI'
// gpt-4o-mini pricing (per 1M tokens) as of late 2024
const COST_PER_INPUT_TOKEN = 0.15 / 1_000_000
const COST_PER_OUTPUT_TOKEN = 0.60 / 1_000_000

// ─── in-memory trackers ───────────────────────────────────────────────────────

function nextMidnightUTC(): number {
  const now = new Date()
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  return midnight.getTime()
}

let dailySpendCents = 0 // stored as fractional cents to avoid float drift
let dailyResetAt = nextMidnightUTC()

const ipTracker = new Map<string, { count: number; resetAt: number }>()

function getCurrentDailySpendUSD(): number {
  if (Date.now() > dailyResetAt) {
    dailySpendCents = 0
    dailyResetAt = nextMidnightUTC()
  }
  return dailySpendCents / 100
}

function getDailyCapUSD(): number {
  return parseFloat(process.env.PLATFORM_DEMO_DAILY_CAP_USD ?? '5')
}

export function recordDemoCost(inputTokens: number, outputTokens: number): void {
  if (Date.now() > dailyResetAt) {
    dailySpendCents = 0
    dailyResetAt = nextMidnightUTC()
  }
  const costUSD = inputTokens * COST_PER_INPUT_TOKEN + outputTokens * COST_PER_OUTPUT_TOKEN
  dailySpendCents += costUSD * 100
}

function checkIpLimit(ip: string): boolean {
  const now = Date.now()
  const entry = ipTracker.get(ip)
  if (!entry || now > entry.resetAt) {
    ipTracker.set(ip, { count: 1, resetAt: now + 24 * 60 * 60 * 1000 })
    return true
  }
  if (entry.count >= 10) return false
  entry.count++
  return true
}

// ─── public API ──────────────────────────────────────────────────────────────

export type DemoIneligibleReason =
  | 'disabled'      // PLATFORM_DEMO_ENABLED is not 'true'
  | 'has_own_key'   // user already configured a BYOK key
  | 'limit_reached' // user has used all 5 free runs
  | 'daily_cap'     // platform daily spend cap exceeded
  | 'ip_limit'      // this IP has made too many demo requests today
  | 'no_platform_key' // PLATFORM_OPENAI_KEY is not configured

export interface DemoCheck {
  eligible: boolean
  reason?: DemoIneligibleReason
  runsUsed: number
  hasOwnKey: boolean
}

export interface DemoStatus {
  enabled: boolean
  runsUsed: number
  runsMax: number
  hasOwnKey: boolean
  eligible: boolean
  reason?: DemoIneligibleReason
}

/**
 * Check whether this request is eligible for a demo run.
 * Does NOT claim the run — call claimDemoRun() after the check passes.
 */
export async function checkDemoEligibility(
  userId: string,
  ip: string
): Promise<DemoCheck> {
  const enabled = process.env.PLATFORM_DEMO_ENABLED === 'true'
  if (!enabled) return { eligible: false, reason: 'disabled', runsUsed: 0, hasOwnKey: false }

  if (!process.env.PLATFORM_OPENAI_KEY) {
    return { eligible: false, reason: 'no_platform_key', runsUsed: 0, hasOwnKey: false }
  }

  const [userKeys, user] = await Promise.all([
    getUserApiKeys(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { demoRunsUsed: true } }),
  ])

  const hasOwnKey = userKeys.length > 0
  const runsUsed = user?.demoRunsUsed ?? 0

  if (hasOwnKey) return { eligible: false, reason: 'has_own_key', runsUsed, hasOwnKey: true }
  if (runsUsed >= DEMO_RUNS_MAX) return { eligible: false, reason: 'limit_reached', runsUsed, hasOwnKey: false }
  if (getCurrentDailySpendUSD() >= getDailyCapUSD()) return { eligible: false, reason: 'daily_cap', runsUsed, hasOwnKey: false }
  if (!checkIpLimit(ip)) return { eligible: false, reason: 'ip_limit', runsUsed, hasOwnKey: false }

  return { eligible: true, runsUsed, hasOwnKey: false }
}

/**
 * Atomically claim one demo run for the user.
 *
 * Uses updateMany with a WHERE demoRunsUsed < DEMO_RUNS_MAX predicate —
 * if two parallel requests both pass checkDemoEligibility, only one will
 * win this update (count > 0). The other gets false and must return 402.
 *
 * Approach (b) from the plan: platform key is passed directly to streamAI/callAI
 * via the platformKey option, bypassing the user key lookup entirely. No DB write
 * for the key itself — clean and auditable.
 */
export async function claimDemoRun(userId: string): Promise<{ claimed: boolean; runsUsed: number }> {
  const result = await prisma.user.updateMany({
    where: { id: userId, demoRunsUsed: { lt: DEMO_RUNS_MAX } },
    data: { demoRunsUsed: { increment: 1 } },
  })
  if (result.count === 0) return { claimed: false, runsUsed: DEMO_RUNS_MAX }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { demoRunsUsed: true } })
  return { claimed: true, runsUsed: user?.demoRunsUsed ?? DEMO_RUNS_MAX }
}

/**
 * Get demo status for the /api/demo/status endpoint and UI.
 * Uses a single getUserApiKeys call to avoid double-fetching.
 */
export async function getDemoStatus(userId: string): Promise<DemoStatus> {
  const enabled = process.env.PLATFORM_DEMO_ENABLED === 'true'
  const [userKeys, user] = await Promise.all([
    getUserApiKeys(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { demoRunsUsed: true } }),
  ])
  const hasOwnKey = userKeys.length > 0
  const runsUsed = user?.demoRunsUsed ?? 0

  if (!enabled) return { enabled: false, runsUsed, runsMax: DEMO_RUNS_MAX, hasOwnKey, eligible: false, reason: 'disabled' }
  if (!process.env.PLATFORM_OPENAI_KEY) return { enabled: false, runsUsed, runsMax: DEMO_RUNS_MAX, hasOwnKey, eligible: false, reason: 'no_platform_key' }
  if (hasOwnKey) return { enabled, runsUsed, runsMax: DEMO_RUNS_MAX, hasOwnKey: true, eligible: false, reason: 'has_own_key' }
  if (runsUsed >= DEMO_RUNS_MAX) return { enabled, runsUsed, runsMax: DEMO_RUNS_MAX, hasOwnKey: false, eligible: false, reason: 'limit_reached' }
  if (getCurrentDailySpendUSD() >= getDailyCapUSD()) return { enabled, runsUsed, runsMax: DEMO_RUNS_MAX, hasOwnKey: false, eligible: false, reason: 'daily_cap' }

  return { enabled, runsUsed, runsMax: DEMO_RUNS_MAX, hasOwnKey: false, eligible: true }
}

/** User-facing message for each ineligible reason. */
export function demoBlockMessage(reason: DemoIneligibleReason | undefined): string {
  switch (reason) {
    case 'limit_reached': return 'You\'ve used all 5 free runs. Add an API key in Settings → API Keys to continue.'
    case 'daily_cap':     return 'Free trial is temporarily unavailable. Add your own API key to keep going.'
    case 'ip_limit':      return 'Too many requests from this network. Add an API key to continue.'
    case 'has_own_key':   return 'API key issue detected. Check Settings → API Keys and try again.'
    case 'no_platform_key':
    case 'disabled':
    default:              return 'No API key configured. Go to Settings → API Keys to add one.'
  }
}

/** The platform key injected for demo runs — approach (b): direct option, no DB write. */
export function getPlatformKeyOption(): { provider: AIProvider; key: string } | null {
  const key = process.env.PLATFORM_OPENAI_KEY
  if (!key) return null
  return { provider: DEMO_PROVIDER, key }
}
