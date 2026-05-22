import { NextResponse, type NextRequest } from 'next/server'
import { withAuth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError } from '@/lib/server/errors'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { getToolById } from '@/lib/server/toolDefinitions'

export async function GET(request: NextRequest) {
  return withAuth(request, async (userId) => {
    const { allowed, retryAfterSec } = checkRateLimit(`api:${userId}`, 60, 60_000)
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(retryAfterSec) } })
    }
    try {
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const prevMonthStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

      const [
        totalRuns,
        runsThisWeek,
        runsThisMonth,
        runsPrevMonth,
        topToolsRaw,
        dailyActivityRaw,
        providerRaw,
        allDates,
      ] = await prisma.$transaction([
        prisma.toolUsage.count({ where: { userId } }),
        prisma.toolUsage.count({ where: { userId, createdAt: { gte: sevenDaysAgo } } }),
        prisma.toolUsage.count({ where: { userId, createdAt: { gte: thirtyDaysAgo } } }),
        prisma.toolUsage.count({ where: { userId, createdAt: { gte: prevMonthStart, lt: thirtyDaysAgo } } }),
        prisma.toolUsage.groupBy({
          by: ['toolId'],
          where: { userId, createdAt: { gte: thirtyDaysAgo } },
          _count: { toolId: true },
          _max: { createdAt: true },
          orderBy: { _count: { toolId: 'desc' } },
          take: 10,
        }),
        prisma.toolUsage.findMany({
          where: { userId, createdAt: { gte: thirtyDaysAgo } },
          select: { createdAt: true },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.toolUsage.groupBy({
          by: ['provider'],
          where: { userId, createdAt: { gte: thirtyDaysAgo } },
          _count: { provider: true },
          orderBy: { _count: { provider: 'desc' } },
        }),
        prisma.toolUsage.findMany({
          where: { userId },
          select: { createdAt: true },
          orderBy: { createdAt: 'asc' },
        }),
      ])

      // Daily activity: group by date string, fill last 30 days
      const dailyMap = new Map<string, number>()
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        dailyMap.set(d.toISOString().slice(0, 10), 0)
      }
      for (const row of dailyActivityRaw) {
        const key = row.createdAt.toISOString().slice(0, 10)
        if (dailyMap.has(key)) dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1)
      }
      const dailyActivity = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }))

      // Provider breakdown — cast _count to the object shape (always true at runtime)
      type ProviderCount = { provider: string | null; _count: { provider: number } }
      const typedProviderRaw = providerRaw as unknown as ProviderCount[]
      const totalProviderRuns = typedProviderRaw.reduce((s, r) => s + r._count.provider, 0)
      const providerBreakdown = typedProviderRaw.map((r) => ({
        provider: r.provider ?? 'unknown',
        count: r._count.provider,
        percentage: totalProviderRuns > 0 ? Math.round((r._count.provider / totalProviderRuns) * 100) : 0,
      }))

      // Top tools — cast _count and _max to object shapes
      type TopToolRow = { toolId: string; _count: { toolId: number }; _max: { createdAt: Date | null } }
      const typedTopToolsRaw = topToolsRaw as unknown as TopToolRow[]
      const topTools = typedTopToolsRaw.map((r) => {
        const tool = getToolById(r.toolId)
        return {
          toolId: r.toolId,
          toolName: tool?.name ?? r.toolId,
          count: r._count.toolId,
          lastUsed: r._max.createdAt ?? null,
        }
      })

      // Average runs per day (last 30 days)
      const averageRunsPerDay = Math.round((runsThisMonth / 30) * 10) / 10

      // Most active day of week (based on last 30 days)
      const dayCount = [0, 0, 0, 0, 0, 0, 0]
      for (const row of dailyActivityRaw) {
        dayCount[row.createdAt.getDay()]++
      }
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const mostActiveDay = dayNames[dayCount.indexOf(Math.max(...dayCount))]

      // Streak: consecutive days with at least one run, ending today (or yesterday)
      let streakDays = 0
      const activeDays = new Set(allDates.map((r) => r.createdAt.toISOString().slice(0, 10)))
      let checkDate = new Date(now)
      while (true) {
        const key = checkDate.toISOString().slice(0, 10)
        if (!activeDays.has(key)) break
        streakDays++
        checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000)
      }

      return NextResponse.json({
        totalRuns,
        runsThisWeek,
        runsThisMonth,
        runsPrevMonth,
        topTools,
        dailyActivity,
        providerBreakdown,
        averageRunsPerDay,
        mostActiveDay,
        streakDays,
      })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
