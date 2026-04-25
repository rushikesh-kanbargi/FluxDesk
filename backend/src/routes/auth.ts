import { Router } from 'express'
import { prisma } from '../prisma/client'
import { authenticate, AuthRequest } from '../middleware/auth'
import { createError } from '../middleware/errorHandler'

export const authRouter = Router()

// GET /api/auth/me — return current user's DB record
// The authenticate middleware auto-creates the record if it doesn't exist yet
authRouter.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      },
    })
    if (!user) throw createError('User not found', 404)
    res.json(user)
  } catch (err) { next(err) }
})
