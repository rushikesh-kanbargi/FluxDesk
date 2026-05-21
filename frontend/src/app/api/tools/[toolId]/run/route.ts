import { NextResponse, type NextRequest } from 'next/server'
import { withAuth } from '@/lib/server/auth'
import { callAI } from '@/lib/server/aiService'
import { getMemoryContext, buildPersonalisationContext, recordToolUsage } from '@/lib/server/memoryService'
import { getToolById } from '@/lib/server/toolDefinitions'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError, createError } from '@/lib/server/errors'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { parseSource, extractFramework, buildUserMessage } from '@/lib/server/toolHelpers'

// GPT-4o at 1500 tokens measured at ~14s. Pro tier (60s) confirmed via vercel.json.
// claude-opus-4-5 timing unmeasured — known gap, revisit with scripts/time-opus.ts.
export const maxDuration = 60

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  return withAuth(request, async (userId) => {
    if (!checkRateLimit(`tool:${userId}`, 10, 60_000)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
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
      const { text, provider } = await callAI({
        userId,
        system,
        messages: [{ role: 'user', content: userMessage }],
        maxTokens: 1500,
        preferredProvider: restBody.preferredProvider ?? restBody.provider,
      })
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
        JSON.stringify(input)
      ).catch((err: unknown) => console.error('[background]', err))

      return NextResponse.json({ output: text, usageId: usage.id, provider, durationMs })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}

