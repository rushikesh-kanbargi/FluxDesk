import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { saveUserApiKey, maskKey } from '@/lib/server/aiService'
import { handleRouteError, createError } from '@/lib/server/errors'

const providerEnum = z.enum(['CLAUDE', 'OPENAI', 'GEMINI', 'GROQ'])

const keySchema = z.object({
  provider: z
    .string()
    .transform((s) => s.toUpperCase())
    .pipe(providerEnum),
  key: z.string().min(10),
  label: z.string().max(50).optional(),
})

export async function GET(request: NextRequest) {
  return withAuth(request, async (userId) => {
    try {
      const keys = await prisma.apiKey.findMany({
        where: { userId },
        select: { id: true, provider: true, keyHint: true, label: true, isActive: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      })
      return NextResponse.json(keys)
    } catch (err) {
      return handleRouteError(err)
    }
  })
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (userId) => {
    try {
      const body = await request.json()
      const { provider, key, label } = keySchema.parse(body)

      if (provider === 'CLAUDE' && !key.startsWith('sk-ant-'))
        throw createError('Claude API keys start with sk-ant-', 400)
      if (provider === 'OPENAI' && !key.startsWith('sk-'))
        throw createError('OpenAI API keys start with sk-', 400)

      await saveUserApiKey(userId, provider, key)

      if (label) {
        await prisma.apiKey.update({
          where: { userId_provider: { userId, provider } },
          data: { label },
        })
      }

      return NextResponse.json({ ok: true, hint: maskKey(key) })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
