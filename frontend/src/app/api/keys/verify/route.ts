import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/server/auth'
import { maskKey } from '@/lib/server/aiService'
import { handleRouteError } from '@/lib/server/errors'

const keySchema = z.object({
  provider: z
    .string()
    .transform((s) => s.toUpperCase())
    .pipe(z.enum(['CLAUDE', 'OPENAI', 'GEMINI', 'GROQ'])),
  key: z.string().min(10),
})

const hints: Record<string, string> = {
  CLAUDE: 'sk-ant-',
  OPENAI: 'sk-',
  GEMINI: 'AIza',
  GROQ: 'gsk_',
}

export async function POST(request: NextRequest) {
  return withAuth(request, async () => {
    try {
      const body = await request.json()
      const { provider, key } = keySchema.parse(body)
      const expectedPrefix = hints[provider]
      const valid = expectedPrefix ? key.startsWith(expectedPrefix) : key.length > 20
      return NextResponse.json({ valid, hint: valid ? maskKey(key) : null })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
