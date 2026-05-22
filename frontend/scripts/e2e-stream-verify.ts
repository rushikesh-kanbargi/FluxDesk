/**
 * End-to-end streaming verification for P0 #1.
 *
 * What this proves:
 *  1. /stream endpoint accepts auth, runs SSE, emits chunk/done events
 *  2. ToolUsage.output persisted with full text + correct durationMs after stream
 *  3. UserMemory.topTools updated with the tool that was run
 *  4. /run still works after toolHelpers.ts refactor (pipeline path regression check)
 *
 * Run: OPENAI_API_KEY=sk-... npx tsx scripts/e2e-stream-verify.ts
 */
import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import { encrypt } from '../src/lib/server/encryption'

const SUPABASE_URL = 'https://nevxlpuguiysskknlnhj.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const API_BASE = 'http://localhost:3000'
const TEST_EMAIL = 'stream-verify@fluxdesk.test'
const TEST_PASS = 'StreamVerify_v1!'

const openaiKey = process.env.OPENAI_API_KEY
if (!openaiKey) { console.error('Set OPENAI_API_KEY'); process.exit(1) }

const prisma = new PrismaClient()
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function pass(msg: string) { console.log(`  ✅ ${msg}`) }
function fail(msg: string) { console.log(`  ❌ ${msg}`) }
function info(msg: string) { console.log(`  ℹ️  ${msg}`) }

// ─── helpers ────────────────────────────────────────────────────────────────

async function getTestSession(): Promise<{ token: string; userId: string }> {
  // Try sign in; if user doesn't exist, create it first
  const pub = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '', {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let result = await pub.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASS })

  if (result.error?.message?.includes('Invalid login credentials')) {
    info('Creating test user...')
    const { error: createErr } = await admin.auth.admin.createUser({
      email: TEST_EMAIL, password: TEST_PASS, email_confirm: true,
    })
    if (createErr) throw new Error(`createUser: ${createErr.message}`)
    result = await pub.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASS })
  }

  if (result.error || !result.data.session) {
    throw new Error(`Auth failed: ${result.error?.message}`)
  }
  return { token: result.data.session.access_token, userId: result.data.user.id }
}

async function ensureApiKey(userId: string) {
  const keyHash = encrypt(openaiKey!)
  const keyHint = openaiKey!.slice(-4)
  await prisma.apiKey.upsert({
    where: { userId_provider: { userId, provider: 'OPENAI' } },
    create: { userId, provider: 'OPENAI', keyHash, keyHint },
    update: { keyHash, keyHint, isActive: true },
  })
  pass(`API key stored (hint: ...${keyHint})`)
}

// ─── stream call ─────────────────────────────────────────────────────────────

async function callStream(token: string): Promise<{ usageId: string; fullOutput: string; chunks: number }> {
  const resp = await fetch(`${API_BASE}/api/tools/commit/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      diff: 'Fixed null check for user.name in UserProfile to prevent crash when user object is undefined',
      typeHint: 'fix', scope: 'UserProfile',
    }),
  })

  if (!resp.ok) {
    const body = await resp.text()
    throw new Error(`HTTP ${resp.status}: ${body}`)
  }

  const reader = resp.body!.getReader()
  const dec = new TextDecoder()
  let buf = '', usageId = '', fullOutput = '', chunks = 0

  process.stdout.write('  Streaming: ')
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const parts = buf.split('\n\n')
    buf = parts.pop() ?? ''
    for (const part of parts) {
      const line = part.trim()
      if (!line.startsWith('data: ')) continue
      const ev = JSON.parse(line.slice(6))
      if (ev.type === 'chunk') { fullOutput += ev.text; chunks++; process.stdout.write('.') }
      else if (ev.type === 'done') { usageId = ev.usageId; process.stdout.write(` done\n`) }
      else if (ev.type === 'error') throw new Error(`SSE error: ${ev.message}`)
    }
  }

  if (!usageId) throw new Error('done event never received')
  return { usageId, fullOutput, chunks }
}

// ─── /run regression call ────────────────────────────────────────────────────

async function callRun(token: string): Promise<{ output: string; usageId: string }> {
  const resp = await fetch(`${API_BASE}/api/tools/standup/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      yesterday: 'finished streaming implementation',
      today: 'verifying DB persistence',
      blockers: 'none',
    }),
  })
  if (!resp.ok) { const b = await resp.text(); throw new Error(`/run HTTP ${resp.status}: ${b}`) }
  return resp.json()
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════╗')
  console.log('║  P0 #1 End-to-End Verification               ║')
  console.log('╚══════════════════════════════════════════════╝\n')

  // 1. Auth
  console.log('1. Auth')
  const { token, userId } = await getTestSession()
  pass(`session: ${userId}`)

  await ensureApiKey(userId)

  // 2. Streaming call
  console.log('\n2. Streaming call → /api/tools/commit/stream')
  const { usageId, fullOutput, chunks } = await callStream(token)
  pass(`${chunks} chunks received, ${fullOutput.length} chars total`)

  // Wait for background recordToolUsage to finish (it's a non-awaited Promise)
  await new Promise(r => setTimeout(r, 1500))

  // 3. ToolUsage persistence
  console.log('\n3. ToolUsage DB row')
  const usage = await prisma.toolUsage.findUnique({
    where: { id: usageId },
    select: { output: true, durationMs: true, provider: true },
  })

  if (!usage) { fail('Row not found'); process.exit(1) }

  if (!usage.output || usage.output.length === 0) {
    fail('output is EMPTY — fire-before-close pattern failed → switch to waitUntil()')
  } else if (usage.output === fullOutput) {
    pass(`output: ${usage.output.length} chars (matches streamed output exactly)`)
  } else {
    fail(`output mismatch: streamed ${fullOutput.length} chars, DB has ${usage.output.length}`)
  }

  usage.durationMs > 0
    ? pass(`durationMs: ${usage.durationMs}ms`)
    : fail('durationMs is 0 — update did not run')

  info(`provider: ${usage.provider}`)

  // 4. UserMemory update
  console.log('\n4. UserMemory update')
  const mem = await prisma.userMemory.findUnique({
    where: { userId },
    select: { topTools: true, preferredProvider: true, inferredStack: true, frameworkAffinities: true },
  })

  if (!mem) { fail('No UserMemory row'); }
  else {
    mem.topTools.includes('commit')
      ? pass(`topTools includes 'commit': ${JSON.stringify(mem.topTools)}`)
      : fail(`'commit' missing from topTools: ${JSON.stringify(mem.topTools)}`)

    mem.preferredProvider
      ? pass(`preferredProvider: ${mem.preferredProvider}`)
      : info('preferredProvider not set yet (needs more runs)')

    info(`inferredStack: ${JSON.stringify(mem.inferredStack)}`)
  }

  // 5. /run regression check (pipeline path)
  console.log('\n5. /run regression (toolHelpers.ts refactor)')
  try {
    const runResult = await callRun(token)
    runResult.output && runResult.output.length > 0
      ? pass(`/run works — ${runResult.output.length} chars, usageId: ${runResult.usageId}`)
      : fail('/run returned empty output')
  } catch (e) {
    fail(`/run threw: ${(e as Error).message}`)
  }

  console.log('\n╔══════════════════════════════════════════════╗')
  console.log('║  Verification complete                       ║')
  console.log('╚══════════════════════════════════════════════╝\n')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
