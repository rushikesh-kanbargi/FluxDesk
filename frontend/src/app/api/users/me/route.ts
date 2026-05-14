import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError } from '@/lib/server/errors'

export async function PATCH(request: NextRequest) {
  return withAuth(request, async (userId) => {
    try {
      const body = await request.json()
      const data = z
        .object({
          displayName: z.string().min(1).max(60).optional(),
          avatarUrl: z.string().url().optional(),
        })
        .parse(body)

      const user = await prisma.user.update({
        where: { id: userId },
        data,
        select: { id: true, email: true, username: true, displayName: true, avatarUrl: true, role: true },
      })
      return NextResponse.json(user)
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
