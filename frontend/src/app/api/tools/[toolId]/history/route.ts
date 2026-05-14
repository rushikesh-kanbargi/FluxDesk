import { NextResponse, type NextRequest } from 'next/server'
import { withAuth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError } from '@/lib/server/errors'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  return withAuth(request, async (userId) => {
    try {
      const { toolId } = await params
      const history = await prisma.toolUsage.findMany({
        where: { userId, toolId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, input: true, output: true, provider: true, durationMs: true, rating: true, createdAt: true },
      })
      return NextResponse.json(history)
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
