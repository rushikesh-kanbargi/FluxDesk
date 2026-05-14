import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError, createError } from '@/lib/server/errors'

const promptSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
  framework: z.string().optional(),
  targetAi: z.string().optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  isStarred: z.boolean().optional(),
  sourceToolId: z.string().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (userId) => {
    try {
      const { id } = await params
      const existing = await prisma.prompt.findFirst({ where: { id, userId } })
      if (!existing) throw createError('Prompt not found', 404)

      const body = await request.json()
      const data = promptSchema.partial().parse(body)
      const updated = await prisma.prompt.update({
        where: { id },
        data: { ...data, updatedAt: new Date() },
      })
      return NextResponse.json(updated)
    } catch (err) {
      return handleRouteError(err)
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (userId) => {
    try {
      const { id } = await params
      const existing = await prisma.prompt.findFirst({ where: { id, userId } })
      if (!existing) throw createError('Prompt not found', 404)

      await prisma.prompt.delete({ where: { id } })
      return NextResponse.json({ ok: true })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
