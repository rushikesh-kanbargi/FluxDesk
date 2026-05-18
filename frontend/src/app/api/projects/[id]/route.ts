import { NextResponse, type NextRequest } from 'next/server'
import { withAuth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError, createError } from '@/lib/server/errors'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  description: z.string().max(200).optional(),
}).refine(
  (d) => Object.values(d).some((v) => v !== undefined),
  { message: 'At least one field is required' }
)

async function getOwnedProject(userId: string, id: string) {
  const project = await prisma.project.findFirst({ where: { id, userId } })
  if (!project) throw createError('Project not found', 404)
  return project
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(request, async (userId) => {
    try {
      const { id } = await params
      const project = await prisma.project.findFirst({
        where: { id, userId },
        include: {
          _count: { select: { toolUsages: true, prompts: true } },
          toolUsages: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
              id: true, toolId: true, source: true,
              createdAt: true, provider: true, durationMs: true,
            },
          },
        },
      })
      if (!project) throw createError('Project not found', 404)
      return NextResponse.json({ project })
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
    try {
      const { id } = await params
      await getOwnedProject(userId, id)
      const body = await request.json()
      const data = updateSchema.parse(body)
      const project = await prisma.project.update({ where: { id }, data })
      return NextResponse.json({ project })
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
    try {
      const { id } = await params
      await getOwnedProject(userId, id)
      await prisma.project.delete({ where: { id } })
      return new NextResponse(null, { status: 204 })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
