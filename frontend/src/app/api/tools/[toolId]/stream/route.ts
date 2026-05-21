import type { NextRequest } from 'next/server'
import { withAuthStream } from '@/lib/server/auth'
import { streamAI } from '@/lib/server/aiService'
import { getMemoryContext, buildPersonalisationContext, recordToolUsage } from '@/lib/server/memoryService'
import { getToolById } from '@/lib/server/toolDefinitions'
import { prisma } from '@/lib/server/prisma'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { parseSource, extractFramework, buildUserMessage } from '@/lib/server/toolHelpers'
import { checkDemoEligibility, claimDemoRun, getPlatformKeyOption, demoBlockMessage } from '@/lib/server/demoService'

// maxDuration validated: GPT-4o at 1500 tokens measured at ~14s on Pro tier (60s limit).
// claude-opus-4-5 timing unmeasured (no Anthropic key during validation) — known gap.
// If Opus exceeds 60s on Pro, that is also a pre-existing /run issue. Revisit with
// scripts/time-opus.ts once an Anthropic key is available.
// Also set in vercel.json under functions["src/app/api/tools/[toolId]/stream/route.ts"].
export const maxDuration = 60

const sse = (obj: unknown) => `data: ${JSON.stringify(obj)}\n\n`

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  return withAuthStream(request, async (userId) => {
    // Rate limit: shared bucket with /run so both paths count toward the same limit
    if (!checkRateLimit(`tool:${userId}`, 10, 60_000)) {
      return Response.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const { toolId } = await params
    const tool = getToolById(toolId)
    if (!tool) {
      return Response.json({ error: 'Unknown tool' }, { status: 404 })
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { projectId, ...restBody } = body

    // Validate project ownership silently (same as /run)
    let resolvedProjectId: string | undefined
    if (projectId && typeof projectId === 'string') {
      const project = await prisma.project.findFirst({ where: { id: projectId, userId } })
      if (project) resolvedProjectId = project.id
    }

    // Zod validation before opening the stream — returns clean JSON error, not SSE
    let input: Record<string, unknown>
    try {
      input = tool.schema.parse(restBody)
    } catch (err) {
      const { ZodError } = await import('zod')
      if (err instanceof ZodError) {
        return Response.json(
          {
            error: 'Please check the highlighted fields and try again.',
            details: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
          },
          { status: 400 }
        )
      }
      return Response.json({ error: 'Invalid input' }, { status: 400 })
    }

    const memCtx = await getMemoryContext(userId)
    const personalisation = buildPersonalisationContext(memCtx)
    const system = tool.buildSystem(personalisation)
    const userMessage = buildUserMessage(tool.id, input)

    // Resolve provider and create generator BEFORE opening the stream response.
    // This lets us return a clean JSON error (402/401) if there's no API key,
    // rather than an SSE error event that the client has to parse differently.
    //
    // Demo path: if streamAI throws 402 (no user key), we check demo eligibility
    // and retry with the platform key. Normal users see no overhead.
    let streamResult: Awaited<ReturnType<typeof streamAI>>
    let isDemo = false
    let demoRunsUsed = 0
    try {
      streamResult = await streamAI({
        userId,
        system,
        messages: [{ role: 'user', content: userMessage }],
        maxTokens: 1500,
        preferredProvider: (restBody.preferredProvider ?? restBody.provider) as import('@/lib/server/aiService').AIProvider | undefined,
      })
    } catch (err) {
      const e = err as Error & { status?: number }
      if (e.status !== 402) {
        return Response.json({ error: e.message }, { status: e.status ?? 500 })
      }

      // No API key — check demo eligibility
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0'
      const demoCheck = await checkDemoEligibility(userId, ip)
      if (!demoCheck.eligible) {
        return Response.json({ error: demoBlockMessage(demoCheck.reason) }, { status: 402 })
      }

      const claimResult = await claimDemoRun(userId)
      if (!claimResult.claimed) {
        return Response.json({ error: demoBlockMessage('limit_reached') }, { status: 402 })
      }

      const platformKey = getPlatformKeyOption()
      if (!platformKey) {
        return Response.json({ error: demoBlockMessage('no_platform_key') }, { status: 402 })
      }

      isDemo = true
      demoRunsUsed = claimResult.runsUsed

      try {
        streamResult = await streamAI({ userId, system, messages: [{ role: 'user', content: userMessage }], maxTokens: 1500, platformKey })
      } catch (demoErr) {
        const de = demoErr as Error & { status?: number }
        return Response.json({ error: de.message }, { status: de.status ?? 500 })
      }
    }

    const source = parseSource(request.headers.get('X-FluxDesk-Client'))
    const { provider } = streamResult

    // Create the usage record before streaming so we have a usageId to send in the done event.
    // Output is initially empty; updated with full text after stream completes.
    const usage = await prisma.toolUsage.create({
      data: {
        userId,
        toolId,
        input: JSON.parse(JSON.stringify(input)),
        output: '',
        provider,
        framework: null,
        durationMs: 0,
        source,
        ...(resolvedProjectId ? { projectId: resolvedProjectId } : {}),
      },
    })

    const encoder = new TextEncoder()
    const start = Date.now()

    const responseStream = new ReadableStream({
      async start(controller) {
        let fullText = ''

        try {
          for await (const chunk of streamResult.stream) {
            fullText += chunk
            controller.enqueue(encoder.encode(sse({ type: 'chunk', text: chunk })))
          }

          const durationMs = Date.now() - start
          const framework = extractFramework(fullText, toolId)

          // Persist the completed output
          await prisma.toolUsage.update({
            where: { id: usage.id },
            data: { output: fullText, durationMs, framework },
          })

          // Fire memory update BEFORE controller.close(). Demo runs skip provider affinity
          // so platform key usage doesn't bias the user's preferred provider.
          recordToolUsage(userId, toolId, framework ?? undefined, provider, JSON.stringify(input), isDemo)
            .catch((err: unknown) => console.error('[background/memory]', err))

          controller.enqueue(
            encoder.encode(sse({ type: 'done', usageId: usage.id, provider, durationMs, ...(isDemo ? { isDemo: true, demoRunsUsed } : {}) }))
          )
        } catch (err) {
          const message = err instanceof Error ? err.message : 'An error occurred during streaming'

          // Persist whatever we managed to accumulate so history isn't empty
          await prisma.toolUsage
            .update({
              where: { id: usage.id },
              data: {
                output: fullText || '[stream interrupted]',
                durationMs: Date.now() - start,
              },
            })
            .catch(() => {})

          controller.enqueue(encoder.encode(sse({ type: 'error', message })))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx/proxy buffering
      },
    })
  })
}
