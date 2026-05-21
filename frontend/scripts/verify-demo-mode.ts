/**
 * P0 #2 Demo Mode Verification
 *
 * Verifies:
 *   1. demoRunsUsed increments correctly on each run
 *   2. Atomic race guard: only one of two parallel claims succeeds at the limit
 *   3. UserMemory integrity: topTools updated, preferredProvider NOT set for demo runs
 *   4. Demo blocked after DEMO_RUNS_MAX
 *   5. getDemoStatus shape correct
 *
 * Requires in .env.local:
 *   PLATFORM_DEMO_ENABLED=true
 *   PLATFORM_OPENAI_KEY=sk-...   (key existence checked; no real API call made)
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DIRECT_URL or DATABASE_URL
 *
 * Run: npx tsx scripts/verify-demo-mode.ts
 */
import { config } from 'dotenv'
import { resolve } from 'path'

// Load env before any app imports — matches P0 #1 pattern in verify-stream-db.ts
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
  await prisma.userMemory.deleteMany({ where: { userId } })
  await prisma.apiKey.deleteMany({ where: { userId } })
  info(`User reset: demoRunsUsed=0, keys cleared, memory cleared`)
}

async function simulateDemoRun(userId: string, runIndex: number): Promise<boolean> {
  const ip = '10.0.0.1'
  const check = await checkDemoEligibility(userId, ip)
  if (!check.eligible) {
    info(`  Run #${runIndex}: ineligible (${check.reason})`)
    return false
  }
  const claim = await claimDemoRun(userId)
  if (!claim.claimed) {
    info(`  Run #${runIndex}: claim lost race`)
    return false
  }
  // skipProviderAffinity=true — same as the stream route does for demo runs
  await recordToolUsage(userId, 'commit', undefined, 'OPENAI', '{"diff":"test"}', true)
  info(`  Run #${runIndex}: claimed, runsUsed=${claim.runsUsed}`)
  return true
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════╗')
  console.log('║  P0 #2 Demo Mode Verification                ║')
  console.log('╚══════════════════════════════════════════════╝\n')

  // Env preflight
  console.log('0. Env preflight')
  const isDemoEnabled = process.env.PLATFORM_DEMO_ENABLED === 'true'
  const hasPlatformKey = !!process.env.PLATFORM_OPENAI_KEY
  info(`PLATFORM_DEMO_ENABLED=${process.env.PLATFORM_DEMO_ENABLED ?? 'unset'}`)
  info(`PLATFORM_OPENAI_KEY=${hasPlatformKey ? 'set ✓' : 'NOT SET — add to .env.local'}`)
  if (!isDemoEnabled) {
    fail('PLATFORM_DEMO_ENABLED must be true to run this verification')
    console.log('\nAdd to .env.local:\n  PLATFORM_DEMO_ENABLED=true\n  PLATFORM_OPENAI_KEY=sk-...\n')
    return
  }
  if (!hasPlatformKey) {
    fail('PLATFORM_OPENAI_KEY must be set to run this verification')
    return
  }
  pass('Env vars present')

  // 1. Setup
  console.log('\n1. Setup')
  const { userId } = await getOrCreateUser()
  pass(`userId: ${userId}`)
  await resetUser(userId)

  // 2. Runs increment × DEMO_RUNS_MAX
  console.log(`\n2. Runs increment (${DEMO_RUNS_MAX} sequential runs)`)
  for (let i = 1; i <= DEMO_RUNS_MAX; i++) {
    await simulateDemoRun(userId, i)
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { demoRunsUsed: true } })
  if (!user) { fail('User row missing'); return }

  user.demoRunsUsed === DEMO_RUNS_MAX
    ? pass(`demoRunsUsed = ${user.demoRunsUsed} (= DEMO_RUNS_MAX ${DEMO_RUNS_MAX})`)
    : fail(`demoRunsUsed = ${user.demoRunsUsed}, expected ${DEMO_RUNS_MAX}`)

  // 3. Blocked after limit
  console.log('\n3. Blocked after limit')
  const blocked = await checkDemoEligibility(userId, '10.0.0.1')
  blocked.eligible
    ? fail('Should be ineligible after DEMO_RUNS_MAX runs')
    : pass(`Blocked: reason=${blocked.reason}, message="${demoBlockMessage(blocked.reason)}"`)

  // 4. getDemoStatus shape
  console.log('\n4. getDemoStatus shape')
  const status = await getDemoStatus(userId)
  info(`status: ${JSON.stringify(status)}`)
  typeof status.enabled === 'boolean' ? pass('enabled is boolean') : fail('enabled missing')
  typeof status.runsMax === 'number'  ? pass(`runsMax=${status.runsMax}`) : fail('runsMax missing')
  status.runsUsed === DEMO_RUNS_MAX   ? pass(`runsUsed=${status.runsUsed}`) : fail(`runsUsed=${status.runsUsed}, expected ${DEMO_RUNS_MAX}`)
  status.eligible === false           ? pass('eligible=false after limit') : fail('eligible should be false')

  // 5. UserMemory integrity (skipProviderAffinity)
  console.log('\n5. UserMemory integrity')
  const mem = await prisma.userMemory.findUnique({
    where: { userId },
    select: { topTools: true, preferredProvider: true, providerAffinities: true },
  })

  if (!mem) {
    fail('No UserMemory row — recordToolUsage() may not have run')
  } else {
    mem.topTools.includes('commit')
      ? pass(`topTools includes 'commit': ${JSON.stringify(mem.topTools)}`)
      : fail(`'commit' missing from topTools: ${JSON.stringify(mem.topTools)}`)

    !mem.preferredProvider
      ? pass('preferredProvider is null (skipProviderAffinity=true worked)')
      : fail(`preferredProvider was set to '${mem.preferredProvider}' — demo runs must not bias this`)

    const affinities = (mem.providerAffinities as Record<string, number>) || {}
    Object.keys(affinities).length === 0
      ? pass('providerAffinities empty (not biased by demo runs)')
      : fail(`providerAffinities was written: ${JSON.stringify(affinities)}`)
  }

  // 6. Race guard — reset to 1 slot left, fire 2 parallel claims
  console.log('\n6. Race guard (2 parallel claims, 1 slot remaining)')
  await prisma.user.update({ where: { id: userId }, data: { demoRunsUsed: DEMO_RUNS_MAX - 1 } })
  info(`Reset demoRunsUsed to ${DEMO_RUNS_MAX - 1}`)

  const [r1, r2] = await Promise.all([claimDemoRun(userId), claimDemoRun(userId)])
  const winners = [r1, r2].filter(r => r.claimed).length
  winners === 1
    ? pass(`Exactly 1 of 2 parallel claims succeeded (r1=${r1.claimed}, r2=${r2.claimed})`)
    : fail(`Expected 1 winner, got ${winners} (r1=${r1.claimed}, r2=${r2.claimed})`)

  // 7. Cleanup
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
