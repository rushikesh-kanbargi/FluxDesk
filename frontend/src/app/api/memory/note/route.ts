import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/server/auth'
import { addMemoryNote } from '@/lib/server/memoryService'
import { handleRouteError } from '@/lib/server/errors'

export async function POST(request: NextRequest) {
  return withAuth(request, async (userId) => {
    try {
      const body = await request.json()
      const { note } = z.object({ note: z.string().min(1).max(300) }).parse(body)
      await addMemoryNote(userId, note)
      return NextResponse.json({ ok: true })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
