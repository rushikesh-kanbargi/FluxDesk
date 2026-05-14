import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError } from '@/lib/server/errors'

export async function GET(request: NextRequest) {
  return withAuth(request, async (userId) => {
    try {
      const prefs = await prisma.userPreference.findUnique({ where: { userId } })
      return NextResponse.json(prefs ?? {})
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
          defaultProvider: z.enum(['CLAUDE', 'OPENAI', 'GEMINI', 'GROQ']).optional(),
          theme: z.enum(['dark', 'light']).optional(),
          sidebarCollapsed: z.boolean().optional(),
        })
        .parse(body)

      const prefs = await prisma.userPreference.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
      })
      return NextResponse.json(prefs)
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
