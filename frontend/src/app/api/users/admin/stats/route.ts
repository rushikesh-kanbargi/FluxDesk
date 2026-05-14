import { NextResponse, type NextRequest } from 'next/server'
import { withAdmin } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError } from '@/lib/server/errors'

export async function GET(request: NextRequest) {
  return withAdmin(request, async () => {
    try {
      const [userCount, promptCount, usageCount, usageToday] = await Promise.all([
        prisma.user.count(),
        prisma.prompt.count(),
        prisma.toolUsage.count(),
        prisma.toolUsage.count({
          where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
        }),
      ])

      const topTools = await prisma.toolUsage.groupBy({
        by: ['toolId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      })

      return NextResponse.json({ userCount, promptCount, usageCount, usageToday, topTools })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
