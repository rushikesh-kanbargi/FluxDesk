import { NextResponse, type NextRequest } from 'next/server'
import { withAuth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError, createError } from '@/lib/server/errors'
import { checkRateLimit } from '@/lib/server/rateLimit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(request, async (userId) => {
    const { allowed, retryAfterSec } = await checkRateLimit(`api:${userId}`, 60, 60_000)
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(retryAfterSec) } })
    }
    try {
      const { id } = await params

      // Ownership check: ensure the pipeline belongs to the requesting user
      const pipeline = await prisma.pipeline.findFirst({ where: { id, userId } })
      if (!pipeline) throw createError('Pipeline not found', 404)

      const runs = await prisma.pipelineRun.findMany({
        where: { pipelineId: id },
        orderBy: { startedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          status: true,
          startedAt: true,
          completedAt: true,
          stepOutputs: true,
        },
      })

      return NextResponse.json({ runs })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
