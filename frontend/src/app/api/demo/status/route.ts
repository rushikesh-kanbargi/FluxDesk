import type { NextRequest } from 'next/server'
import { withAuth } from '@/lib/server/auth'
import { getDemoStatus } from '@/lib/server/demoService'
import { NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return withAuth(request, async (userId) => {
    const status = await getDemoStatus(userId)
    return NextResponse.json(status)
  })
}
