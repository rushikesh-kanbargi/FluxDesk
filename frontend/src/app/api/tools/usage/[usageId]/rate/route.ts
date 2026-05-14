import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError, createError } from '@/lib/server/errors'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ usageId: string }> }
) {
  return withAuth(request, async (userId) => {
    try {
      const { usageId } = await params
      const body = await request.json()
      const { rating } = z.object({ rating: z.number().min(1).max(5) }).parse(body)

      const usage = await prisma.toolUsage.findFirst({ where: { id: usageId, userId } })
      if (!usage) throw createError('Not found', 404)

      await prisma.toolUsage.update({ where: { id: usage.id }, data: { rating } })
      return NextResponse.json({ ok: true })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
