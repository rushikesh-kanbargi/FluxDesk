import { NextResponse, type NextRequest } from 'next/server'
import { withAuth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError } from '@/lib/server/errors'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { createPipelineSchema } from '@/lib/server/pipelineSchemas'

export async function GET(request: NextRequest) {
  return withAuth(request, async (userId) => {
    const { allowed, retryAfterSec } = await checkRateLimit(`api:${userId}`, 60, 60_000)
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(retryAfterSec) } })
    }
    try {
      const pipelines = await prisma.pipeline.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { runs: true } },
          steps: {
            select: { id: true, toolId: true, order: true },
            orderBy: { order: 'asc' },
          },
          runs: {
            orderBy: { startedAt: 'desc' },
            take: 1,
            select: { startedAt: true, status: true },
          },
        },
      })
      return NextResponse.json({ pipelines })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (userId) => {
    const { allowed, retryAfterSec } = await checkRateLimit(`api:${userId}`, 60, 60_000)
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(retryAfterSec) } })
    }
    try {
      const body = await request.json()
      const data = createPipelineSchema.parse(body)

      const pipeline = await prisma.pipeline.create({
        data: {
          userId,
          name: data.name,
          description: data.description,
          steps: {
            create: data.steps.map((s) => ({
              toolId: s.toolId,
              order: s.order,
              inputMapping: s.inputMapping,
            })),
          },
        },
        include: {
          steps: { orderBy: { order: 'asc' } },
          _count: { select: { runs: true } },
        },
      })

      return NextResponse.json({ pipeline }, { status: 201 })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
