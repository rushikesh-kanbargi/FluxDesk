import { NextResponse, type NextRequest } from 'next/server'
import { withAuth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError, createError } from '@/lib/server/errors'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (userId) => {
    try {
      const { id } = await params
      const existing = await prisma.prompt.findFirst({ where: { id, userId } })
      if (!existing) throw createError('Not found', 404)

      const updated = await prisma.prompt.update({
        where: { id },
        data: { isStarred: !existing.isStarred },
      })
      return NextResponse.json({ isStarred: updated.isStarred })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
