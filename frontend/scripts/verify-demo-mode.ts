/**
 * P0 #2 Demo Mode Verification
 *
 * Verifies:
 *   1. demoRunsUsed increments correctly on each run
 *   2. Atomic race guard: only one of two parallel claims succeeds at the limit
 *   3. UserMemory updates for demo runs (topTools updated, preferredProvider NOT set)
 *   4. Demo blocked after DEMO_RUNS_MAX
 *
 * No real API calls — injects platformKey directly and mocks the streamAI/callAI path
 * by calling the DB side-effects directly.
 *
 * Run: DATABASE_URL="postgres://..." npx tsx scripts/verify-demo-mode.ts
 *   (or use DIRECT_URL from .env.local)
 */
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(__dirname, '../.env.local') })
config({ path: resolve(__dirname, '../.env') })

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import {
  checkDemoEligibility,
  claimDemoRun,
  getDemoStatus,
  demoBlockMessage,
  DEMO_RUNS_MAX,
} from '../src/lib/server/demoService'
import { recordToolUsage } from '../src/lib/server/memoryService'

const prisma = new PrismaClient()

const SUPABASE_URL = process.env.SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const TEST_EMAIL = 'demo-verify@fluxdesk.test'

function pass(msg: string) { console.log(`  ✅ ${msg}`) }
function fail(msg: string) { console.error(`  ❌ ${msg}`); process.exitCode = 1 }
function info(msg: string) { console.log(`  ℹ️  ${msg}`) }

async function getOrCreateUser(): Promise<{ userId: string }> {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: { users } } = await admin.auth.admin.listUsers()
  let user = users.find(u => u.email === TEST_EMAIL)
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: TEST_EMAIL, password: 'DemoVerify_v1!', email_confirm: true,
    })
    if (error) throw new Error(`createUser: ${error.message}`)
    user = data.user
  }
  return { userId: user!.id }
}

async function resetUser(userId: string) {
  await prisma.user.upsert({
    where: { id: userId },
    create: { id: userId, email: TEST_EMAIL, demoRunsUsed: 0 },
    update: { demoRunsUsed: 0 },
  })
  // Clear memory so preferredProvider is unset
  await prisma.userMemory.deleteMany({ where: { userId } })
  await prisma.apiKey.deleteMany({ where: { userId } })
  info(`User reset: demoRunsUsed=0, keys cleared, memory cleared`)
}

async function simulateDemoRun(userId: string, runIndex: number): Promise<void> {
  const ip = '10.0.0.1'
  const check = await checkDemoEligibility(userId, ip)
  if (!check.eligible) {
    info(`  Run #${runIndex}: ineligible (${check.reason}) — expected after limit`)
    return
  }

  const claim = await claimDemoRun(userId)
  if (!claim.claimed) {
    info(`  Run #${runIndex}: claim failed (race guard kicked in)`)
    return
  }

  // Simulate recordToolUsage as stream route does — skipProviderAffinity=true
  await recordToolUsage(userId, 'commit', undefined, 'OPENAI', '{"diff":"test"}', true)
  info(`  Run #${runIndex}: claimed OK, runsUsed=${claim.runsUsed}`)
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════╗')
  console.log('║  P0 #2 Demo Mode Verification                ║')
  console.log('╚══════════════════════════════════════════════╝\n')

  // Env check
  const isDemoEnabled = process.env.PLATFORM_DEMO_ENABLED === 'true'
  const hasPlatformKey = !!process.env.PLATFORM_OPENAI_KEY
  info(`PLATFORM_DEMO_ENABLED=${process.env.PLATFORM_DEMO_ENABLED}`)
  info(`PLATFORM_OPENAI_KEY=${hasPlatformKey ? 'set' : 'not set'}`)

  if (!isDemoEnabled) {
    info('Demo disabled — testing with feature flag OFF (should return reason: disabled)')
  }

  // Setup
  console.log('\n1. Setup')
  const { userId } = await getOrCreateUser()
  pass(`userId: ${userId}`)
  await resetUser(userId)

  // 2. demoRunsUsed increments
  console.log('\n2. Runs increment (simulating 5 sequential runs)')
  for (let i = 1; i <= DEMO_RUNS_MAX; i++) {
    await simulateDemoRun(userId, i)
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { demoRunsUsed: true } })
  if (!user) { fail('User row missing'); return }

  if (!isDemoEnabled) {
    info(`Demo disabled — demoRunsUsed=${user.demoRunsUsed} (runs don't increment when disabled)`)
  } else {
    user.demoRunsUsed === DEMO_RUNS_MAX
      ? pass(`demoRunsUsed = ${user.demoRunsUsed} (= DEMO_RUNS_MAX ${DEMO_RUNS_MAX})`)
      : fail(`demoRunsUsed = ${user.demoRunsUsed}, expected ${DEMO_RUNS_MAX}`)
  }

  // 3. Blocked after limit
  console.log('\n3. Blocked after limit')
  if (isDemoEnabled) {
    const check = await checkDemoEligibility(userId, '10.0.0.1')
    check.eligible
      ? fail('Should be ineligible after DEMO_RUNS_MAX runs')
      : pass(`Blocked: reason=${check.reason}, message="${demoBlockMessage(check.reason)}"`)
  } else {
    const check = await checkDemoEligibility(userId, '10.0.0.1')
    check.reason === 'disabled'
      ? pass(`Correctly blocked: reason=disabled`)
      : fail(`Expected reason=disabled, got ${check.reason}`)
  }

  // 4. getDemoStatus shape
  console.log('\n4. getDemoStatus shape')
  const status = await getDemoStatus(userId)
  info(`status: ${JSON.stringify(status)}`)
  typeof status.enabled === 'boolean' ? pass('enabled is boolean') : fail('enabled missing')
  typeof status.runsMax === 'number' ? pass(`runsMax=${status.runsMax}`) : fail('runsMax missing')
  typeof status.hasOwnKey === 'boolean' ? pass('hasOwnKey is boolean') : fail('hasOwnKey missing')

  // 5. UserMemory: topTools updated, preferredProvider NOT set for demo runs
  console.log('\n5. UserMemory integrity (skipProviderAffinity)')
  const mem = await prisma.userMemory.findUnique({
    where: { userId },
    select: { topTools: true, preferredProvider: true, providerAffinities: true },
  })

  if (!mem) {
    info('No UserMemory row (no runs ran — demo is disabled)')
  } else {
    if (isDemoEnabled) {
      mem.topTools.includes('commit')
        ? pass(`topTools includes 'commit': ${JSON.stringify(mem.topTools)}`)
        : fail(`'commit' missing from topTools: ${JSON.stringify(mem.topTools)}`)

      !mem.preferredProvider
        ? pass('preferredProvider is null (skipProviderAffinity=true worked)')
        : fail(`preferredProvider was set to '${mem.preferredProvider}' — should be null for demo runs`)

      const affinities = (mem.providerAffinities as Record<string, number>) || {}
      Object.keys(affinities).length === 0
        ? pass('providerAffinities empty (not biased by demo runs)')
        : fail(`providerAffinities was written: ${JSON.stringify(affinities)}`)
    } else {
      info('Demo disabled — memory not written by demo runs, skipping checks')
    }
  }

  // 6. Race guard simulation
  console.log('\n6. Race guard (parallel claims at limit)')
  // Reset to 4 runs used (1 slot left)
  await prisma.user.update({ where: { id: userId }, data: { demoRunsUsed: DEMO_RUNS_MAX - 1 } })
  info(`Reset demoRunsUsed to ${DEMO_RUNS_MAX - 1} (1 slot remaining)`)

  if (isDemoEnabled) {
    const [r1, r2] = await Promise.all([claimDemoRun(userId), claimDemoRun(userId)])
    const wins = [r1, r2].filter(r => r.claimed).length
    wins === 1
      ? pass(`Exactly 1 of 2 parallel claims succeeded (race guard works)`)
      : fail(`Expected 1 winner, got ${wins} (r1.claimed=${r1.claimed}, r2.claimed=${r2.claimed})`)
  } else {
    info('Demo disabled — skipping race guard test (claimDemoRun not called when disabled)')
  }

  // Cleanup
  console.log('\n7. Cleanup')
  await prisma.userMemory.deleteMany({ where: { userId } })
  await prisma.user.update({ where: { id: userId }, data: { demoRunsUsed: 0 } })
  pass('Test user reset to clean state')

  console.log('\n╔══════════════════════════════════════════════╗')
  console.log('║  P0 #2 Demo Mode Verification Complete       ║')
  console.log('╚══════════════════════════════════════════════╝\n')
}

main()
  .catch(e => { console.error('\n', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
