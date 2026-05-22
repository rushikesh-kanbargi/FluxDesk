/**
 * P0 #1 verification: checks that the streaming endpoint persisted correctly.
 * Run: npx tsx scripts/verify-stream.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // --- ToolUsage: last 3 rows ---
  const usages = await prisma.toolUsage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: {
      id: true,
      toolId: true,
      output: true,
      durationMs: true,
      provider: true,
      createdAt: true,
    },
  })

  console.log('\n=== Last 3 ToolUsage rows ===')
  for (const u of usages) {
    console.log({
      id: u.id,
      toolId: u.toolId,
      outputLength: u.output?.length ?? 0,
      outputEmpty: !u.output || u.output.length === 0,
      durationMs: u.durationMs,
      provider: u.provider,
      createdAt: u.createdAt,
    })
  }

  const latest = usages[0]
  if (!latest) {
    console.log('\n❌ No ToolUsage rows found — run a tool first')
    return
  }

  console.log('\n=== Verdict: ToolUsage ===')
  if (latest.output && latest.output.length > 0 && latest.durationMs > 0) {
    console.log(`✅ output: ${latest.output.length} chars, durationMs: ${latest.durationMs}ms`)
  } else if (!latest.output || latest.output.length === 0) {
    console.log(`❌ output is EMPTY — fire-before-close pattern failed, switch to waitUntil()`)
  } else {
    console.log(`⚠️  durationMs: ${latest.durationMs} — check if update ran`)
  }

  // --- UserMemory for the user who ran the tool ---
  const mem = await prisma.userMemory.findUnique({
    where: { userId: latest.userId ?? '' },
    select: {
      frameworkAffinities: true,
      topTools: true,
      preferredProvider: true,
      inferredStack: true,
    },
  })

  // latest.userId isn't in select above; get it separately
  const latestFull = await prisma.toolUsage.findUnique({
    where: { id: latest.id },
    select: { userId: true },
  })

  const memory = latestFull?.userId
    ? await prisma.userMemory.findUnique({
        where: { userId: latestFull.userId },
        select: {
          frameworkAffinities: true,
          topTools: true,
          preferredProvider: true,
          inferredStack: true,
        },
      })
    : null

  console.log('\n=== Verdict: UserMemory ===')
  if (!memory) {
    console.log('❌ No UserMemory row found for this user')
  } else {
    const affinities = memory.frameworkAffinities as Record<string, number>
    console.log('topTools:', memory.topTools)
    console.log('preferredProvider:', memory.preferredProvider)
    console.log('inferredStack:', memory.inferredStack)
    console.log('frameworkAffinities (top 5):', Object.entries(affinities).sort(([,a],[,b]) => b - a).slice(0, 5))

    const providerOk = !!memory.preferredProvider
    const topToolsOk = Array.isArray(memory.topTools) && memory.topTools.length > 0
    if (providerOk && topToolsOk) {
      console.log('✅ Memory updated correctly')
    } else {
      console.log('⚠️  Memory fields look thin — verify recordToolUsage() ran')
    }
  }

  // Cleanup the temp query; mem was wrongly called — handled above via latestFull
  void mem
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
