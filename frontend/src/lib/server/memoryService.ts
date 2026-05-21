import { prisma } from './prisma'
import { logger } from './logger'

export interface MemoryContext {
  inferredRole?: string
  inferredStack: string[]
  inferredDomain?: string
  topTools: string[]
  frameworkAffinities: Record<string, number>
  writingStyle?: string
  memoryNotes: string[]
}

export async function getOrCreateMemory(userId: string) {
  return prisma.userMemory.upsert({
    where: { userId },
    create: { userId },
    update: {},
  })
}

export async function getMemoryContext(userId: string): Promise<MemoryContext> {
  const memory = await getOrCreateMemory(userId)
  return {
    inferredRole: memory.inferredRole || undefined,
    inferredStack: memory.inferredStack,
    inferredDomain: memory.inferredDomain || undefined,
    topTools: memory.topTools,
    frameworkAffinities: (memory.frameworkAffinities as Record<string, number>) || {},
    writingStyle: memory.writingStyle || undefined,
    memoryNotes: memory.memoryNotes,
  }
}

function sanitizeForPrompt(value: string | null | undefined): string {
  if (!value) return ''
  return value
    .replace(/\[INST\]|\[\/INST\]|<\|.*?\|>|###\s*(System|Human|Assistant)/gi, '')
    .replace(/ignore previous instructions?/gi, '')
    .replace(/you are now/gi, '')
    .slice(0, 500)
}

export function buildPersonalisationContext(ctx: MemoryContext): string {
  const parts: string[] = []

  const role = sanitizeForPrompt(ctx.inferredRole)
  if (role) parts.push(`The user is a ${role}.`)
  if (ctx.inferredStack.length > 0)
    parts.push(`Their typical tech stack includes: ${ctx.inferredStack.slice(0, 6).join(', ')}.`)
  const domain = sanitizeForPrompt(ctx.inferredDomain)
  if (domain) parts.push(`They work in the ${domain} domain.`)
  const writingStyle = sanitizeForPrompt(ctx.writingStyle)
  if (writingStyle) parts.push(`Preferred output style: ${writingStyle}.`)

  const topFws = Object.entries(ctx.frameworkAffinities)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([fw]) => fw)
  if (topFws.length > 0) parts.push(`User often uses these prompt frameworks: ${topFws.join(', ')}.`)
  if (ctx.memoryNotes.length > 0) {
    const sanitizedNotes = ctx.memoryNotes.slice(-3).map((n) => sanitizeForPrompt(n)).filter(Boolean)
    if (sanitizedNotes.length > 0) parts.push(`Additional context: ${sanitizedNotes.join(' ')}`)
  }

  if (parts.length === 0) return ''
  return `[USER CONTEXT — use to personalise your response]\n${parts.join('\n')}\n[END USER CONTEXT]\n\n`
}

export async function recordToolUsage(
  userId: string,
  toolId: string,
  framework?: string,
  provider?: string,
  inputText?: string,
  /** Demo runs: update tool/stack memory but skip biasing preferred provider */
  skipProviderAffinity = false
): Promise<void> {
  try {
    const memory = await getOrCreateMemory(userId)

    const freq = (memory.toolFrequency as Record<string, number>) || {}
    freq[toolId] = (freq[toolId] || 0) + 1

    const topTools = Object.entries(freq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([t]) => t)

    let affinities = (memory.frameworkAffinities as Record<string, number>) || {}
    if (framework) {
      const current = affinities[framework] || 0
      affinities[framework] = Math.min(1, current + 0.1)
      for (const key of Object.keys(affinities)) {
        if (key !== framework) affinities[key] = Math.max(0, affinities[key] - 0.01)
      }
      // Keep only top 50 framework affinities
      const sorted = Object.entries(affinities)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 50)
      affinities = Object.fromEntries(sorted)
    }

    const provAffinities = (memory.providerAffinities as Record<string, number>) || {}
    if (provider && !skipProviderAffinity) {
      // Normal BYOK run — update provider affinities and preferred provider
      provAffinities[provider] = (provAffinities[provider] || 0) + 1
      const topProvider = Object.entries(provAffinities).sort(([, a], [, b]) => b - a)[0]?.[0]
      await prisma.userMemory.update({
        where: { userId },
        data: {
          toolFrequency: freq,
          topTools,
          frameworkAffinities: affinities,
          providerAffinities: provAffinities,
          preferredProvider: topProvider,
        },
      })
    } else {
      // Demo run or no provider — update tool/framework memory only
      await prisma.userMemory.update({
        where: { userId },
        data: { toolFrequency: freq, topTools, frameworkAffinities: affinities },
      })
    }

    if (inputText) extractAndSaveStackSignals(userId, inputText).catch((err: unknown) => console.error('[background]', err))
  } catch (err) {
    logger.error(`Memory update failed: ${(err as Error).message}`)
  }
}

const TECH_SIGNALS: Record<string, string[]> = {
  React: ['react', 'jsx', 'tsx', 'usestate', 'useeffect', 'next.js', 'nextjs'],
  Vue: ['vue', 'nuxt'],
  Angular: ['angular', 'ng-'],
  TypeScript: ['typescript', '.ts', 'interface ', 'type ', ': string', ': number'],
  'Node.js': ['node.js', 'nodejs', 'express', 'fastify', 'npm', 'require('],
  Python: ['python', 'def ', 'import ', '.py', 'django', 'flask', 'fastapi'],
  PostgreSQL: ['postgresql', 'postgres', 'pg.', 'prisma', 'sequelize'],
  MongoDB: ['mongodb', 'mongoose', '.find(', 'aggregate('],
  Docker: ['docker', 'dockerfile', 'docker-compose', 'container'],
  AWS: ['aws', 'lambda', 's3', 'ec2', 'dynamodb'],
  GraphQL: ['graphql', 'query {', 'mutation {', 'resolver'],
  Redis: ['redis', 'cache', 'pub/sub'],
}

async function extractAndSaveStackSignals(userId: string, text: string): Promise<void> {
  const lower = text.toLowerCase()
  const detected: string[] = []
  for (const [tech, signals] of Object.entries(TECH_SIGNALS)) {
    if (signals.some((s) => lower.includes(s))) detected.push(tech)
  }
  if (!detected.length) return

  const memory = await prisma.userMemory.findUnique({ where: { userId } })
  if (!memory) return

  const existing = new Set(memory.inferredStack)
  detected.forEach((t) => existing.add(t))
  await prisma.userMemory.update({
    where: { userId },
    data: { inferredStack: Array.from(existing).slice(0, 20) },
  })
}

export async function addMemoryNote(userId: string, note: string): Promise<void> {
  const memory = await getOrCreateMemory(userId)
  if (memory.memoryNotes.some((n) => n === note)) return
  const unique = [...new Set([...memory.memoryNotes, note])].slice(-20)
  await prisma.userMemory.update({ where: { userId }, data: { memoryNotes: unique } })
}

export async function updateUserContext(
  userId: string,
  updates: { inferredRole?: string; inferredDomain?: string; writingStyle?: string }
): Promise<void> {
  await prisma.userMemory.update({ where: { userId }, data: updates })
}
