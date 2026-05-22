import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError } from '@/lib/server/errors'
import { checkRateLimit } from '@/lib/server/rateLimit'

const promptSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
  framework: z.string().optional(),
  targetAi: z.string().optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  isStarred: z.boolean().optional(),
  sourceToolId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  return withAuth(request, async (userId) => {
    const { allowed, retryAfterSec } = checkRateLimit(`api:${userId}`, 60, 60_000)
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(retryAfterSec) } })
    }
    try {
      const { searchParams } = new URL(request.url)
      const search = searchParams.get('search') ?? undefined
      const tag = searchParams.get('tag') ?? undefined
      const starred = searchParams.get('starred')
      const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
      const offset = parseInt(searchParams.get('offset') ?? '0')

      const where: Record<string, unknown> = { userId }
      if (starred === 'true') where.isStarred = true
      if (tag) where.tags = { has: tag }
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { body: { contains: search, mode: 'insensitive' } },
          { tags: { has: search } },
        ]
      }

      const [prompts, total] = await Promise.all([
        prisma.prompt.findMany({ where, orderBy: { updatedAt: 'desc' }, take: limit, skip: offset }),
        prisma.prompt.count({ where }),
      ])

      return NextResponse.json({ prompts, total })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (userId) => {
    const { allowed, retryAfterSec } = checkRateLimit(`api:${userId}`, 60, 60_000)
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(retryAfterSec) } })
    }
    try {
      const body = await request.json()
      const data = promptSchema.parse(body)
      const prompt = await prisma.prompt.create({
        data: { ...data, userId, tags: data.tags ?? [] },
      })
      return NextResponse.json(prompt, { status: 201 })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
