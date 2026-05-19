import { NextResponse, type NextRequest } from 'next/server'
import { withAuth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError } from '@/lib/server/errors'

export async function GET(request: NextRequest) {
  return withAuth(request, async (userId) => {
    try {
      const prompts = await prisma.prompt.findMany({
        where: { userId },
        select: { tags: true },
        take: 1000,
      })
      const tagSet = new Set<string>()
      prompts.forEach((p) => p.tags.forEach((t) => tagSet.add(t)))
      return NextResponse.json([...tagSet].sort())
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
