import { NextResponse, type NextRequest } from 'next/server'
import { withAdmin } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError } from '@/lib/server/errors'

export async function GET(request: NextRequest) {
  return withAdmin(request, async () => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          role: true,
          createdAt: true,
          _count: { select: { prompts: true, toolUsages: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json(users)
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
