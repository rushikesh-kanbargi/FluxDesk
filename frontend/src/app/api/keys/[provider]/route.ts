import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError } from '@/lib/server/errors'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  return withAuth(request, async (userId) => {
    try {
      const { provider: rawProvider } = await params
      const provider = z
        .enum(['CLAUDE', 'OPENAI', 'GEMINI', 'GROQ'])
        .parse(decodeURIComponent(rawProvider).toUpperCase())

      await prisma.apiKey.deleteMany({ where: { userId, provider } })
      return NextResponse.json({ ok: true })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
