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
