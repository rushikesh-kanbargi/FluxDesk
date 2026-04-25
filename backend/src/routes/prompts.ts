import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

export const promptsRouter = Router();
promptsRouter.use(authenticate);

const promptSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
  framework: z.string().optional(),
  targetAi: z.string().optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  isStarred: z.boolean().optional(),
  sourceToolId: z.string().optional(),
});

// GET /api/prompts
promptsRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { search, tag, starred, limit = '50', offset = '0' } = req.query as Record<string, string>;

    const where: any = { userId: req.userId };
    if (starred === 'true') where.isStarred = true;
    if (tag) where.tags = { has: tag };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    const [prompts, total] = await Promise.all([
      prisma.prompt.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: Math.min(parseInt(limit), 100),
        skip: parseInt(offset),
      }),
      prisma.prompt.count({ where }),
    ]);

    res.json({ prompts, total });
  } catch (err) { next(err); }
});

// POST /api/prompts
promptsRouter.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = promptSchema.parse(req.body);
    const prompt = await prisma.prompt.create({
      data: { ...data, userId: req.userId!, tags: data.tags || [] },
    });
    res.status(201).json(prompt);
  } catch (err) { next(err); }
});

// PATCH /api/prompts/:id
promptsRouter.patch('/:id', async (req: AuthRequest, res, next) => {
  try {
    const promptId = req.params.id as string;
    const existing = await prisma.prompt.findFirst({
      where: { id: promptId, userId: req.userId! },
    });
    if (!existing) { next(createError('Prompt not found', 404)); return; }

    const data = promptSchema.partial().parse(req.body);
    const updated = await prisma.prompt.update({
      where: { id: promptId },
      data: { ...data, updatedAt: new Date() },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/prompts/:id
promptsRouter.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const promptId = req.params.id as string;
    const existing = await prisma.prompt.findFirst({
      where: { id: promptId, userId: req.userId! },
    });
    if (!existing) { next(createError('Prompt not found', 404)); return; }
    await prisma.prompt.delete({ where: { id: promptId } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// GET /api/prompts/export — markdown export
promptsRouter.get('/export', async (req: AuthRequest, res, next) => {
  try {
    const prompts = await prisma.prompt.findMany({
      where: { userId: req.userId! },
      orderBy: { updatedAt: 'desc' },
    });

    const lines = [
      '# Prompt Library Export',
      `_Exported ${new Date().toLocaleDateString()} — ${prompts.length} prompts_`,
      '',
      '---',
      '',
    ];

    prompts.forEach(p => {
      lines.push(`## ${p.title}`);
      if (p.tags.length) lines.push(`**Tags:** ${p.tags.join(', ')}`);
      if (p.targetAi) lines.push(`**AI:** ${p.targetAi}`);
      if (p.framework) lines.push(`**Framework:** ${p.framework}`);
      if (p.isStarred) lines.push('**★ Starred**');
      lines.push('', '```', p.body, '```', '', '---', '');
    });

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="prompts-${Date.now()}.md"`);
    res.send(lines.join('\n'));
  } catch (err) { next(err); }
});

// POST /api/prompts/:id/star
promptsRouter.post('/:id/star', async (req: AuthRequest, res, next) => {
  try {
    const promptId = req.params.id as string;
    const existing = await prisma.prompt.findFirst({
      where: { id: promptId, userId: req.userId! },
    });
    if (!existing) { next(createError('Not found', 404)); return; }
    const updated = await prisma.prompt.update({
      where: { id: promptId },
      data: { isStarred: !existing.isStarred },
    });
    res.json({ isStarred: updated.isStarred });
  } catch (err) { next(err); }
});

// GET /api/prompts/tags — all tags for the user
promptsRouter.get('/tags', async (req: AuthRequest, res, next) => {
  try {
    const prompts = await prisma.prompt.findMany({
      where: { userId: req.userId! },
      select: { tags: true },
    });
    const tagSet = new Set<string>();
    prompts.forEach(p => p.tags.forEach(t => tagSet.add(t)));
    res.json([...tagSet].sort());
  } catch (err) { next(err); }
});
