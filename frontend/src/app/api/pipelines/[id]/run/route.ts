import { NextResponse, type NextRequest } from 'next/server'
import { withAuth } from '@/lib/server/auth'
import { handleRouteError } from '@/lib/server/errors'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { prisma } from '@/lib/server/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(request, async (userId) => {
    const { allowed, retryAfterSec } = await checkRateLimit(`pipeline-run:${userId}`, 10, 60_000)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
      )
    }
    try {
      const { id } = await params

      // Verify pipeline ownership
      const pipeline = await prisma.pipeline.findFirst({
        where: { id, userId },
        include: { steps: { orderBy: { order: 'asc' } } },
      })
      if (!pipeline) {
        return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })
      }

      // Create run record — client drives step execution from here
      const run = await prisma.pipelineRun.create({
        data: { pipelineId: id, userId, status: 'RUNNING', stepOutputs: {} },
      })

      return NextResponse.json({ runId: run.id })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
