import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from './prisma'
import { handleRouteError } from './errors'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

type AuthHandler = (userId: string, userRole: string) => Promise<NextResponse>

export async function withAuth(request: NextRequest, handler: AuthHandler): Promise<NextResponse> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Sign in again to continue.' }, { status: 401 })
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)
  if (error || !user) {
    return NextResponse.json(
      { error: 'Your session has expired. Sign in again to continue.' },
      { status: 401 }
    )
  }

  try {
    const dbUser = await prisma.user.upsert({
      where: { id: user.id },
      update: { email: user.email! },
      create: {
        id: user.id,
        email: user.email!,
        displayName: user.user_metadata?.name || user.user_metadata?.full_name,
        avatarUrl: user.user_metadata?.avatar_url,
      },
      select: { id: true, role: true },
    })

    return await handler(dbUser.id, dbUser.role as string)
  } catch (err) {
    return handleRouteError(err)
  }
}

/**
 * Auth wrapper for streaming routes that return a plain Response (not NextResponse).
 * NextResponse cannot wrap a ReadableStream without buffering it, so streaming
 * routes use this variant instead of withAuth.
 */
type StreamAuthHandler = (userId: string, userRole: string) => Promise<Response>

export async function withAuthStream(request: NextRequest, handler: StreamAuthHandler): Promise<Response> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return Response.json({ error: 'Sign in again to continue.' }, { status: 401 })
  }

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    return Response.json(
      { error: 'Your session has expired. Sign in again to continue.' },
      { status: 401 }
    )
  }

  try {
    const dbUser = await prisma.user.upsert({
      where: { id: user.id },
      update: { email: user.email! },
      create: {
        id: user.id,
        email: user.email!,
        displayName: user.user_metadata?.name || user.user_metadata?.full_name,
        avatarUrl: user.user_metadata?.avatar_url,
      },
      select: { id: true, role: true },
    })
    return await handler(dbUser.id, dbUser.role as string)
  } catch (err) {
    const e = err as Error & { status?: number }
    const status = e.status ?? 500
    const message = process.env.NODE_ENV === 'production' && status === 500
      ? 'Internal server error'
      : e.message
    return Response.json({ error: message }, { status })
  }
}

export async function withAdmin(request: NextRequest, handler: AuthHandler): Promise<NextResponse> {
  return withAuth(request, async (userId, userRole) => {
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'You do not have permission to access this area.' },
        { status: 403 }
      )
    }
    return handler(userId, userRole)
  })
}
