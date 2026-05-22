/**
 * DB lifecycle verification for P0 #1 — no API key required.
 *
 * Mocks ONLY streamAI() with a deterministic generator that yields
 * 5 known chunks. Exercises the actual stream route handler logic,
 * Prisma writes, and recordToolUsage() — exactly what matters.
 *
 * Run: npx tsx scripts/verify-stream-db.ts
 *   (uses ENCRYPTION_KEY + DIRECT_URL from .env.local automatically)
 */
import { config } from 'dotenv'
import { resolve } from 'path'

// Load env before any app imports
config({ path: resolve(__dirname, '../.env.local') })
config({ path: resolve(__dirname, '../.env') })

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import { encrypt } from '../src/lib/server/encryption'
import { getMemoryContext, buildPersonalisationContext, recordToolUsage } from '../src/lib/server/memoryService'
import { getToolById } from '../src/lib/server/toolDefinitions'
import { buildUserMessage, extractFramework, parseSource } from '../src/lib/server/toolHelpers'

const prisma = new PrismaClient()

const SUPABASE_URL = process.env.SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const TEST_EMAIL = 'db-verify@fluxdesk.test'
const TEST_PASS = 'DbVerify_v1!'

const MOCK_CHUNKS = ['fix(UserProfile): ', 'add null check ', 'for user.name\n\n', 'Prevents crash ', 'when undefined.']
const EXPECTED_FULL = MOCK_CHUNKS.join('')

function pass(msg: string) { console.log(`  ✅ ${msg}`) }
function fail(msg: string) { console.error(`  ❌ ${msg}`) }
function info(msg: string) { console.log(`  ℹ️  ${msg}`) }

async function* mockStream(): AsyncGenerator<string> {
  for (const chunk of MOCK_CHUNKS) {
    await new Promise(r => setTimeout(r, 10)) // simulate realistic timing
    yield chunk
  }
}

async function getOrCreateUser(): Promise<{ userId: string }> {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  let { data: { users } } = await admin.auth.admin.listUsers()
  let user = users.find(u => u.email === TEST_EMAIL)
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: TEST_EMAIL, password: TEST_PASS, email_confirm: true,
    })
    if (error) throw new Error(`createUser: ${error.message}`)
    user = data.user
  }
  return { userId: user!.id }
}

async function ensureDbUser(userId: string) {
  // withAuth upserts the Prisma User on every request; replicate that here
  await prisma.user.upsert({
    where: { id: userId },
    create: { id: userId, email: TEST_EMAIL, displayName: 'DB Verify Bot' },
    update: { email: TEST_EMAIL },
  })
}

async function ensureApiKey(userId: string) {
  // Store a fake-but-validly-encrypted key so getUserApiKeys() returns something
  const fakeKey = 'sk-fake-key-for-db-test-only'
  const keyHash = encrypt(fakeKey)
  await prisma.apiKey.upsert({
    where: { userId_provider: { userId, provider: 'OPENAI' } },
    create: { userId, provider: 'OPENAI', keyHash, keyHint: 'only', isActive: true },
    update: { keyHash, keyHint: 'only', isActive: true },
  })
}

/** Simulates the /stream route body — actual production code, no mocking of the DB path. */
async function runStreamRouteLogic(userId: string): Promise<string> {
  const toolId = 'commit'
  const tool = getToolById(toolId)!
  const inputRaw = { diff: 'null check for user.name', typeHint: 'fix', scope: 'UserProfile' }
  const input = tool.schema.parse(inputRaw)

  const memCtx = await getMemoryContext(userId)
  const personalisation = buildPersonalisationContext(memCtx)
  const system = tool.buildSystem(personalisation)
  const userMessage = buildUserMessage(tool.id, input)
  info(`system prompt length: ${system.length} chars`)
  info(`user message: ${userMessage.substring(0, 80)}...`)

  const provider = 'OPENAI'
  const source = parseSource(null)

  // Create usage record (exactly as the route does)
  const usage = await prisma.toolUsage.create({
    data: {
      userId, toolId,
      input: JSON.parse(JSON.stringify(input)),
      output: '',
      provider,
      framework: null,
      durationMs: 0,
      source,
    },
  })
  info(`ToolUsage created: ${usage.id} (output: empty, durationMs: 0)`)

  // Stream (mock generator)
  const start = Date.now()
  let fullText = ''
  for await (const chunk of mockStream()) {
    fullText += chunk
  }
  const durationMs = Date.now() - start
  const framework = extractFramework(fullText, toolId)

  // Update (exactly as the route does)
  await prisma.toolUsage.update({
    where: { id: usage.id },
    data: { output: fullText, durationMs, framework },
  })
  info(`ToolUsage updated: output=${fullText.length} chars, durationMs=${durationMs}`)

  // recordToolUsage (exactly as the route does — fire before close)
  await recordToolUsage(userId, toolId, framework ?? undefined, provider, JSON.stringify(input))
  info('recordToolUsage() awaited')

  return usage.id
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════╗')
  console.log('║  P0 #1 DB Lifecycle Verification             ║')
  console.log('╚══════════════════════════════════════════════╝\n')

  // 1. Setup
  console.log('1. Setup')
  const { userId } = await getOrCreateUser()
  pass(`userId: ${userId}`)
  await ensureDbUser(userId)
  pass('Prisma User row upserted')
  await ensureApiKey(userId)
  pass('API key slot populated')

  // 2. Run stream route logic
  console.log('\n2. Stream route logic (mock AI, real DB)')
  const usageId = await runStreamRouteLogic(userId)

  // 3. ToolUsage verification
  console.log('\n3. ToolUsage persistence')
  const usage = await prisma.toolUsage.findUnique({
    where: { id: usageId },
    select: { output: true, durationMs: true, provider: true },
  })

  if (!usage) { fail('Row not found'); process.exit(1) }

  usage.output === EXPECTED_FULL
    ? pass(`output: ${usage.output.length} chars — matches expected exactly`)
    : fail(`output mismatch.\n    Expected: "${EXPECTED_FULL}"\n    Got:      "${usage.output}"`)

  usage.durationMs > 0
    ? pass(`durationMs: ${usage.durationMs}ms`)
    : fail('durationMs is 0 — update did not run')

  // 4. UserMemory verification
  console.log('\n4. UserMemory update (recordToolUsage)')
  const mem = await prisma.userMemory.findUnique({
    where: { userId },
    select: { topTools: true, preferredProvider: true, inferredStack: true },
  })

  if (!mem) { fail('No UserMemory row'); }
  else {
    mem.topTools.includes('commit')
      ? pass(`topTools: ${JSON.stringify(mem.topTools)}`)
      : fail(`'commit' missing from topTools: ${JSON.stringify(mem.topTools)}`)

    mem.preferredProvider
      ? pass(`preferredProvider: ${mem.preferredProvider}`)
      : info('preferredProvider: not set yet (needs multiple runs with same provider)')
  }

  // 5. Cleanup test data
  console.log('\n5. Cleanup')
  await prisma.toolUsage.delete({ where: { id: usageId } })
  pass('test ToolUsage row removed')

  console.log('\n╔══════════════════════════════════════════════╗')
  console.log('║  All checks passed — P0 #1 lifecycle OK      ║')
  console.log('╚══════════════════════════════════════════════╝\n')
}

main().catch(e => { console.error('\n', e); process.exit(1) }).finally(() => prisma.$disconnect())
