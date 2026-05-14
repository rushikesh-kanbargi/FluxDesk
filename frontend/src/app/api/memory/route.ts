import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { getMemoryContext, updateUserContext } from '@/lib/server/memoryService'
import { handleRouteError } from '@/lib/server/errors'

export async function GET(request: NextRequest) {
  return withAuth(request, async (userId) => {
    try {
      const ctx = await getMemoryContext(userId)
      return NextResponse.json(ctx)
    } catch (err) {
      return handleRouteError(err)
    }
  })
}

export async function PATCH(request: NextRequest) {
  return withAuth(request, async (userId) => {
    try {
      const body = await request.json()
      const data = z
        .object({
          inferredRole: z.string().max(100).optional(),
          inferredDomain: z.string().max(100).optional(),
          writingStyle: z.enum(['concise', 'detailed', 'bullet-heavy']).optional(),
          outputLength: z.enum(['short', 'medium', 'long']).optional(),
        })
        .parse(body)

      await updateUserContext(userId, data)
      return NextResponse.json({ ok: true })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}

export async function DELETE(request: NextRequest) {
  return withAuth(request, async (userId) => {
    try {
      await prisma.userMemory.update({
        where: { userId },
        data: {
          frameworkAffinities: {},
          providerAffinities: {},
          topTools: [],
          toolFrequency: {},
          inferredStack: [],
          inferredRole: null,
          inferredDomain: null,
          writingStyle: null,
          memoryNotes: [],
        },
      })
      return NextResponse.json({ ok: true })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
