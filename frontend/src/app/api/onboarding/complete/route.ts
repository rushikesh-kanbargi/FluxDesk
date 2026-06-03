import { NextResponse, type NextRequest } from 'next/server'
import { withAuth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError } from '@/lib/server/errors'
import { checkRateLimit } from '@/lib/server/rateLimit'

export async function POST(request: NextRequest) {
  return withAuth(request, async (userId) => {
    try {
      const { allowed, retryAfterSec } = await checkRateLimit(`api:${userId}`, 60, 60_000)
      if (!allowed) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(retryAfterSec) } })
      }

      await prisma.userPreference.upsert({
        where: { userId },
        create: { userId, onboardingCompleted: true },
        update: { onboardingCompleted: true },
      })

      return NextResponse.json({ ok: true })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
