import { NextResponse, type NextRequest } from 'next/server'
import { withAuth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError, createError } from '@/lib/server/errors'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { z } from 'zod'

const stepSchema = z.object({
  toolId: z.string().min(1),
  order: z.number().int().min(1),
  inputMapping: z.record(z.string(), z.string()),
})

const updateSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    steps: z.array(stepSchema).optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: 'At least one field is required',
  })

async function getOwnedPipeline(userId: string, id: string) {
  const pipeline = await prisma.pipeline.findFirst({ where: { id, userId } })
  if (!pipeline) throw createError('Pipeline not found', 404)
  return pipeline
}

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
      const pipeline = await prisma.pipeline.findFirst({
        where: { id, userId },
        include: {
          steps: { orderBy: { order: 'asc' } },
          runs: {
            orderBy: { startedAt: 'desc' },
            take: 5,
            select: {
              id: true,
              status: true,
              startedAt: true,
              completedAt: true,
              stepOutputs: true,
            },
          },
          _count: { select: { runs: true } },
        },
      })
      if (!pipeline) throw createError('Pipeline not found', 404)
      return NextResponse.json({ pipeline })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}

export async function PATCH(
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
      await getOwnedPipeline(userId, id)
      const body = await request.json()
      const data = updateSchema.parse(body)

      // If steps are provided, replace all steps atomically
      const pipeline = await prisma.$transaction(async (tx) => {
        if (data.steps !== undefined) {
          await tx.pipelineStep.deleteMany({ where: { pipelineId: id } })
        }

        return tx.pipeline.update({
          where: { id },
          data: {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.steps !== undefined && {
              steps: {
                create: data.steps.map((s) => ({
                  toolId: s.toolId,
                  order: s.order,
                  inputMapping: s.inputMapping,
                })),
              },
            }),
          },
          include: {
            steps: { orderBy: { order: 'asc' } },
            _count: { select: { runs: true } },
          },
        })
      })

      return NextResponse.json({ pipeline })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}

export async function DELETE(
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
      await getOwnedPipeline(userId, id)
      await prisma.pipeline.delete({ where: { id } })
      return new NextResponse(null, { status: 204 })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
