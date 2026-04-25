import { createClient } from '@supabase/supabase-js'
import { Request, Response, NextFunction } from 'express'
import { prisma } from '../prisma/client'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export interface AuthRequest extends Request {
  userId?: string
  userRole?: string
}

export async function authenticate(
  req: AuthRequest, res: Response, next: NextFunction
) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    res.status(401).json({ error: 'Sign in again to continue.' })
    return
  }

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    res.status(401).json({ error: 'Your session has expired. Sign in again to continue.' })
    return
  }

  // Auto-create user record on first visit (upsert)
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

    req.userId = dbUser.id
    req.userRole = dbUser.role
    next()
  } catch (err) {
    next(err)
  }
}

export function requireAdmin(
  req: AuthRequest, res: Response, next: NextFunction
) {
  if (req.userRole !== 'ADMIN') {
    res.status(403).json({ error: 'You do not have permission to access this area.' })
    return
  }
  next()
}
