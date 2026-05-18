import { NextResponse, type NextRequest } from 'next/server'
import { withAuth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError } from '@/lib/server/errors'
import { ToolSource } from '@prisma/client'
import { z } from 'zod'

const querySchema = z.object({
  platform: z.nativeEnum(ToolSource).optional(),
  projectId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
})

export async function GET(request: NextRequest) {
  return withAuth(request, async (userId) => {
    try {
      const { searchParams } = new URL(request.url)
      const query = querySchema.parse({
        platform: searchParams.get('platform')?.toUpperCase() || undefined,
        projectId: searchParams.get('projectId') || undefined,
        limit: searchParams.get('limit') || undefined,
        cursor: searchParams.get('cursor') || undefined,
      })

      const where: {
        userId: string
        source?: ToolSource
        projectId?: string
      } = { userId }
      if (query.platform) where.source = query.platform
      if (query.projectId) where.projectId = query.projectId

      const usages = await prisma.toolUsage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        select: {
          id: true,
          toolId: true,
          source: true,
          projectId: true,
          provider: true,
          durationMs: true,
          rating: true,
          createdAt: true,
          // input is intentionally excluded — can be large JSON
          output: true,
          project: { select: { id: true, name: true, color: true } },
        },
      })

      const hasMore = usages.length > query.limit
      const items = hasMore ? usages.slice(0, query.limit) : usages
      const nextCursor = hasMore ? items[items.length - 1].id : null

      return NextResponse.json({ items, nextCursor })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
