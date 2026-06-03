import { NextResponse, type NextRequest } from 'next/server'
import { withAuth } from '@/lib/server/auth'
import { handleRouteError } from '@/lib/server/errors'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { executeSingleStep } from '@/lib/server/pipelineEngine'
import { stepOutputsSchema } from '@/lib/server/pipelineSchemas'
import { z } from 'zod'

export const maxDuration = 60

const stepSchema = z.object({
  runId:          z.string().uuid(),
  stepOrder:      z.number().int().min(1).max(20),
  initialInput:   z.string().min(1).max(10000),
  stepOutputs:    stepOutputsSchema.default({}),
  skipCache:      z.boolean().default(false),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(request, async (userId) => {
    // Steps are faster than full runs; allow 20/min
    const { allowed, retryAfterSec } = await checkRateLimit(`pipeline-step:${userId}`, 20, 60_000)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
      )
    }
    try {
      const { id: pipelineId } = await params
      const body = await request.json()
      const { runId, stepOrder, initialInput, stepOutputs, skipCache } = stepSchema.parse(body)

      const { stepOutput } = await executeSingleStep(
        runId,
        pipelineId,
        userId,
        stepOrder,
        initialInput,
        stepOutputs,
        skipCache,
      )

      return NextResponse.json({ stepOutput })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
