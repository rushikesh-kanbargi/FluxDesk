import { NextResponse, type NextRequest } from 'next/server'
import { withAuth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError } from '@/lib/server/errors'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { z } from 'zod'

const stepSchema = z.object({
  toolId: z.string().min(1),
  order: z.number().int().min(1),
  inputMapping: z.record(z.string(), z.string()),
})

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  steps: z.array(stepSchema).optional().default([]),
})

export async function GET(request: NextRequest) {
  return withAuth(request, async (userId) => {
    const { allowed, retryAfterSec } = checkRateLimit(`api:${userId}`, 60, 60_000)
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
    const { allowed, retryAfterSec } = checkRateLimit(`api:${userId}`, 60, 60_000)
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(retryAfterSec) } })
    }
    try {
      const body = await request.json()
      const data = createSchema.parse(body)

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
