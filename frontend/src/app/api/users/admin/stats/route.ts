import { NextResponse, type NextRequest } from 'next/server'
import { withAdmin } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError } from '@/lib/server/errors'

export async function GET(request: NextRequest) {
  return withAdmin(request, async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

      const [userCount, promptCount, usageCount, usageToday, topTools] =
        await prisma.$transaction([
          prisma.user.count(),
          prisma.prompt.count(),
          prisma.toolUsage.count({
            where: { createdAt: { gte: thirtyDaysAgo } },
          }),
          prisma.toolUsage.count({
            where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
          }),
          prisma.toolUsage.groupBy({
            by: ['toolId'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10,
            where: { createdAt: { gte: thirtyDaysAgo } },
          }),
        ])

      return NextResponse.json({ userCount, promptCount, usageCount, usageToday, topTools })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
