import { NextResponse, type NextRequest } from 'next/server'
import { withAuth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError, createError } from '@/lib/server/errors'

export async function GET(request: NextRequest) {
  return withAuth(request, async (userId) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, username: true, displayName: true, avatarUrl: true, role: true, createdAt: true },
      })
      if (!user) throw createError('User not found', 404)
      return NextResponse.json(user)
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
