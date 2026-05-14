import { NextResponse, type NextRequest } from 'next/server'
import { withAuth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError } from '@/lib/server/errors'

export async function GET(request: NextRequest) {
  return withAuth(request, async (userId) => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const [totalUsages, todayUsages, promptCount, starredCount, memory] = await Promise.all([
        prisma.toolUsage.count({ where: { userId } }),
        prisma.toolUsage.count({ where: { userId, createdAt: { gte: today } } }),
        prisma.prompt.count({ where: { userId } }),
        prisma.prompt.count({ where: { userId, isStarred: true } }),
        prisma.userMemory.findUnique({ where: { userId } }),
      ])

      const usagesByTool = await prisma.toolUsage.groupBy({
        by: ['toolId'],
        where: { userId },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      })

      return NextResponse.json({
        totalUsages,
        todayUsages,
        promptCount,
        starredCount,
        topTools: usagesByTool.slice(0, 5).map((u) => ({ toolId: u.toolId, count: u._count.id })),
        inferredStack: memory?.inferredStack ?? [],
        inferredRole: memory?.inferredRole,
        preferredProvider: memory?.preferredProvider,
      })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
