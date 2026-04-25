import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

export const usersRouter = Router();
usersRouter.use(authenticate);

// PATCH /api/users/me — update profile
usersRouter.patch('/me', async (req: AuthRequest, res, next) => {
  try {
    const data = z.object({
      displayName: z.string().min(1).max(60).optional(),
      avatarUrl: z.string().url().optional(),
    }).parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.userId! },
      data,
      select: { id: true, email: true, username: true, displayName: true, avatarUrl: true, role: true },
    });
    res.json(user);
  } catch (err) { next(err); }
});

// GET /api/users/preferences
usersRouter.get('/preferences', async (req: AuthRequest, res, next) => {
  try {
    const prefs = await prisma.userPreference.findUnique({ where: { userId: req.userId! } });
    res.json(prefs || {});
  } catch (err) { next(err); }
});

// PATCH /api/users/preferences
usersRouter.patch('/preferences', async (req: AuthRequest, res, next) => {
  try {
    const data = z.object({
      defaultProvider: z.enum(['CLAUDE', 'OPENAI', 'GEMINI', 'GROQ']).optional(),
      theme: z.enum(['dark', 'light']).optional(),
      sidebarCollapsed: z.boolean().optional(),
    }).parse(req.body);

    const prefs = await prisma.userPreference.upsert({
      where: { userId: req.userId! },
      create: { userId: req.userId!, ...data },
      update: data,
    });
    res.json(prefs);
  } catch (err) { next(err); }
});

// ── Admin routes ──

// GET /api/users — list all users (admin)
usersRouter.get('/', requireAdmin, async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, email: true, username: true, displayName: true,
        role: true, createdAt: true,
        _count: { select: { prompts: true, toolUsages: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) { next(err); }
});

// GET /api/users/admin/stats (admin)
usersRouter.get('/admin/stats', requireAdmin, async (_req, res, next) => {
  try {
    const [userCount, promptCount, usageCount, usageToday] = await Promise.all([
      prisma.user.count(),
      prisma.prompt.count(),
      prisma.toolUsage.count(),
      prisma.toolUsage.count({
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
    ]);

    const topTools = await prisma.toolUsage.groupBy({
      by: ['toolId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    res.json({ userCount, promptCount, usageCount, usageToday, topTools });
  } catch (err) { next(err); }
});
