import { NextResponse, type NextRequest } from 'next/server'
import { withAuth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError } from '@/lib/server/errors'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#F5A623'),
  description: z.string().max(200).optional(),
})

export async function GET(request: NextRequest) {
  return withAuth(request, async (userId) => {
    if (!checkRateLimit(`api:${userId}`, 60, 60_000)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }
    try {
      const projects = await prisma.project.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { toolUsages: true, prompts: true } },
        },
      })
      return NextResponse.json({ projects })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (userId) => {
    if (!checkRateLimit(`api:${userId}`, 60, 60_000)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }
    try {
      const body = await request.json()
      const data = createSchema.parse(body)
      const project = await prisma.project.create({
        data: { userId, ...data },
      })
      return NextResponse.json({ project }, { status: 201 })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
