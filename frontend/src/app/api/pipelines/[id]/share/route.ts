import { NextResponse, type NextRequest } from 'next/server'
import { withAuth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError, createError } from '@/lib/server/errors'
import { checkRateLimit } from '@/lib/server/rateLimit'

/** POST — generate a share token for a pipeline the user owns. Idempotent: returns
 *  the existing token if one already exists, so callers can always POST safely. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(request, async (userId) => {
    const { allowed, retryAfterSec } = await checkRateLimit(`api:${userId}`, 60, 60_000)
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(retryAfterSec) } })
    }
    try {
      const { id } = await params
      const pipeline = await prisma.pipeline.findFirst({ where: { id, userId } })
      if (!pipeline) throw createError('Pipeline not found', 404)

      // Return existing token if already shared — POST is idempotent
      if (pipeline.shareToken) {
        const shareUrl = buildShareUrl(request, pipeline.shareToken)
        return NextResponse.json({ shareToken: pipeline.shareToken, shareUrl })
      }

      const shareToken = crypto.randomUUID()
      await prisma.pipeline.update({ where: { id }, data: { shareToken } })

      const shareUrl = buildShareUrl(request, shareToken)
      return NextResponse.json({ shareToken, shareUrl }, { status: 201 })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}

/** DELETE — revoke the share token. Visitors with the old link get a 404. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(request, async (userId) => {
    const { allowed, retryAfterSec } = await checkRateLimit(`api:${userId}`, 60, 60_000)
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(retryAfterSec) } })
    }
    try {
      const { id } = await params
      const pipeline = await prisma.pipeline.findFirst({ where: { id, userId } })
      if (!pipeline) throw createError('Pipeline not found', 404)

      await prisma.pipeline.update({ where: { id }, data: { shareToken: null } })
      return new NextResponse(null, { status: 204 })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}

function buildShareUrl(request: NextRequest, token: string): string {
  const host = request.headers.get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  return `${proto}://${host}/share/${token}`
}
