import { NextResponse, type NextRequest } from 'next/server'
import { withAuth } from '@/lib/server/auth'
import { handleRouteError } from '@/lib/server/errors'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { executePipeline } from '@/lib/server/pipelineEngine'
import { z } from 'zod'

const runSchema = z.object({
  initialInput: z.string().min(1).max(10000),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(request, async (userId) => {
    // Tighter limit: 5 pipeline runs per minute per user
    const { allowed, retryAfterSec } = checkRateLimit(`pipeline-run:${userId}`, 5, 60_000)
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(retryAfterSec) } })
    }
    try {
      const { id } = await params
      const body = await request.json()
      const { initialInput } = runSchema.parse(body)

      const startedAt = Date.now()
      const result = await executePipeline(id, userId, initialInput)
      const durationMs = Date.now() - startedAt

      if (!result.success) {
        return NextResponse.json(
          { error: result.error ?? 'Pipeline execution failed', stepOutputs: result.stepOutputs },
          { status: 500 }
        )
      }

      return NextResponse.json({
        finalOutput: result.finalOutput,
        stepOutputs: result.stepOutputs,
        durationMs,
      })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
