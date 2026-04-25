import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getMemoryContext, addMemoryNote, updateUserContext } from '../services/memoryService';
import { prisma } from '../prisma/client';

export const memoryRouter = Router();
memoryRouter.use(authenticate);

// GET /api/memory — get current memory context
memoryRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const ctx = await getMemoryContext(req.userId!);
    res.json(ctx);
  } catch (err) { next(err); }
});

// GET /api/memory/stats — usage stats for dashboard
memoryRouter.get('/stats', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalUsages, todayUsages, promptCount, starredCount, memory] = await Promise.all([
      prisma.toolUsage.count({ where: { userId } }),
      prisma.toolUsage.count({ where: { userId, createdAt: { gte: today } } }),
      prisma.prompt.count({ where: { userId } }),
      prisma.prompt.count({ where: { userId, isStarred: true } }),
      prisma.userMemory.findUnique({ where: { userId } }),
    ]);

    // Tool usage breakdown
    const usagesByTool = await prisma.toolUsage.groupBy({
      by: ['toolId'],
      where: { userId },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    res.json({
      totalUsages,
      todayUsages,
      promptCount,
      starredCount,
      topTools: usagesByTool.slice(0, 5).map(u => ({ toolId: u.toolId, count: u._count.id })),
      inferredStack: memory?.inferredStack || [],
      inferredRole: memory?.inferredRole,
      preferredProvider: memory?.preferredProvider,
    });
  } catch (err) { next(err); }
});

// PATCH /api/memory — update explicit preferences
memoryRouter.patch('/', async (req: AuthRequest, res, next) => {
  try {
    const data = z.object({
      inferredRole: z.string().max(100).optional(),
      inferredDomain: z.string().max(100).optional(),
      writingStyle: z.enum(['concise', 'detailed', 'bullet-heavy']).optional(),
      outputLength: z.enum(['short', 'medium', 'long']).optional(),
    }).parse(req.body);

    await updateUserContext(req.userId!, data);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/memory/note — add a memory note
memoryRouter.post('/note', async (req: AuthRequest, res, next) => {
  try {
    const { note } = z.object({ note: z.string().min(1).max(300) }).parse(req.body);
    await addMemoryNote(req.userId!, note);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/memory — clear memory (reset)
memoryRouter.delete('/', async (req: AuthRequest, res, next) => {
  try {
    await prisma.userMemory.update({
      where: { userId: req.userId! },
      data: {
        frameworkAffinities: {},
        providerAffinities: {},
        topTools: [],
        toolFrequency: {},
        inferredStack: [],
        inferredRole: null,
        inferredDomain: null,
        writingStyle: null,
        memoryNotes: [],
      },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});
