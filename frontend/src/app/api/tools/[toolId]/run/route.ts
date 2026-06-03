import { NextResponse, type NextRequest } from 'next/server'
import { withAuth } from '@/lib/server/auth'
import { callAI } from '@/lib/server/aiService'
import { getMemoryContext, buildPersonalisationContext, recordToolUsage } from '@/lib/server/memoryService'
import { getToolById } from '@/lib/server/toolDefinitions'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError, createError } from '@/lib/server/errors'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { parseSource, extractFramework, buildUserMessage } from '@/lib/server/toolHelpers'
import { checkDemoEligibility, claimDemoRun, getPlatformKeyOption, demoBlockMessage } from '@/lib/server/demoService'

// GPT-4o at 1500 tokens measured at ~14s. Pro tier (60s) confirmed via vercel.json.
// claude-opus-4-5 timing unmeasured — known gap, revisit with scripts/time-opus.ts.
export const maxDuration = 60

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  return withAuth(request, async (userId) => {
    const { allowed: rateLimitAllowed, retryAfterSec } = await checkRateLimit(`tool:${userId}`, 10, 60_000)
    if (!rateLimitAllowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before retrying.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
      )
    }
    try {
      const { toolId } = await params
      const tool = getToolById(toolId)
      if (!tool) throw createError('Unknown tool', 404)

      const body = await request.json()
      const { projectId, ...restBody } = body

      // Validate projectId belongs to this user before writing
      let resolvedProjectId: string | undefined
      if (projectId && typeof projectId === 'string') {
        const project = await prisma.project.findFirst({ where: { id: projectId, userId } })
        if (project) resolvedProjectId = project.id
        // Silently ignore invalid/unauthorized projectId rather than failing the run
      }

      const input = tool.schema.parse(restBody)

      const memCtx = await getMemoryContext(userId)
      const personalisation = buildPersonalisationContext(memCtx)
      const system = tool.buildSystem(personalisation)
      const userMessage = buildUserMessage(tool.id, input)

      const start = Date.now()
      let aiResult: { text: string; provider: string }
      let isDemo = false
      let demoRunsUsed = 0

      try {
        aiResult = await callAI({
          userId,
          system,
          messages: [{ role: 'user', content: userMessage }],
          maxTokens: 1500,
          preferredProvider: restBody.preferredProvider ?? restBody.provider,
        })
      } catch (err) {
        const e = err as Error & { status?: number }
        if (e.status !== 402) throw err

        // No API key — check demo eligibility
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0'
        const demoCheck = await checkDemoEligibility(userId, ip)
        if (!demoCheck.eligible) {
          return NextResponse.json({ error: demoBlockMessage(demoCheck.reason) }, { status: 402 })
        }

        const claimResult = await claimDemoRun(userId)
        if (!claimResult.claimed) {
          return NextResponse.json({ error: demoBlockMessage('limit_reached') }, { status: 402 })
        }

        const platformKey = getPlatformKeyOption()
        if (!platformKey) {
          return NextResponse.json({ error: demoBlockMessage('no_platform_key') }, { status: 402 })
        }

        isDemo = true
        demoRunsUsed = claimResult.runsUsed
        // Approach (b): platformKey passed directly — streamAI/callAI bypass user key DB lookup.
        // Key lives in PLATFORM_OPENAI_KEY env var only. See demoService.getPlatformKeyOption().
        aiResult = await callAI({ userId, system, messages: [{ role: 'user', content: userMessage }], maxTokens: 1500, platformKey })
      }

      const { text, provider } = aiResult
      const durationMs = Date.now() - start

      const source = parseSource(request.headers.get('X-FluxDesk-Client'))

      const usage = await prisma.toolUsage.create({
        data: {
          userId,
          toolId,
          input: JSON.parse(JSON.stringify(input)),
          output: text,
          provider,
          framework: extractFramework(text, toolId),
          durationMs,
          source,
          ...(resolvedProjectId ? { projectId: resolvedProjectId } : {}),
        },
      })

      recordToolUsage(
        userId,
        toolId,
        extractFramework(text, toolId) ?? undefined,
        provider,
        JSON.stringify(input),
        isDemo
      ).catch((err: unknown) => console.error('[background]', err))

      return NextResponse.json({ output: text, usageId: usage.id, provider, durationMs, ...(isDemo ? { isDemo: true, demoRunsUsed } : {}) })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}

