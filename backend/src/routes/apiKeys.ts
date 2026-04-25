import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { saveUserApiKey, maskKey, decryptKey } from '../services/aiService';
import { prisma } from '../prisma/client';
import { createError } from '../middleware/errorHandler';

export const apiKeysRouter = Router();
apiKeysRouter.use(authenticate);

const providerEnum = z.enum(['CLAUDE', 'OPENAI', 'GEMINI', 'GROQ']);

const keySchema = z.object({
  // UI may send lowercase; Prisma enum is uppercase
  provider: z
    .string()
    .transform((s) => s.toUpperCase())
    .pipe(providerEnum),
  key: z.string().min(10),
  label: z.string().max(50).optional(),
});

// GET /api/keys — list user's configured keys (hints only, never raw)
apiKeysRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: req.userId! },
      select: { id: true, provider: true, keyHint: true, label: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(keys);
  } catch (err) { next(err); }
});

// POST /api/keys — add or update a key
apiKeysRouter.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { provider, key, label } = keySchema.parse(req.body);

    // Quick validation: try to detect obviously wrong keys
    if (provider === 'CLAUDE' && !key.startsWith('sk-ant-')) {
      throw createError('Claude API keys start with sk-ant-', 400);
    }
    if (provider === 'OPENAI' && !key.startsWith('sk-')) {
      throw createError('OpenAI API keys start with sk-', 400);
    }

    await saveUserApiKey(req.userId!, provider, key);

    if (label) {
      await prisma.apiKey.update({
        where: { userId_provider: { userId: req.userId!, provider } },
        data: { label },
      });
    }

    res.json({ ok: true, hint: maskKey(key) });
  } catch (err) { next(err); }
});

// DELETE /api/keys/:provider (accepts openai or OPENAI in path)
apiKeysRouter.delete('/:provider', async (req: AuthRequest, res, next) => {
  try {
    const raw = decodeURIComponent(req.params.provider);
    const provider = providerEnum.parse(raw.toUpperCase());
    await prisma.apiKey.deleteMany({
      where: { userId: req.userId!, provider },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/keys/verify — test a key without saving
apiKeysRouter.post('/verify', async (req: AuthRequest, res, next) => {
  try {
    const { provider, key } = keySchema.parse(req.body);

    // Temporarily save, test, report — don't persist if invalid
    // For now we do basic format check; real validation happens on first AI call
    const hints: Record<string, string> = {
      CLAUDE: 'sk-ant-',
      OPENAI: 'sk-',
      GEMINI: 'AIza',
      GROQ: 'gsk_',
    };

    const expectedPrefix = hints[provider];
    const valid = expectedPrefix ? key.startsWith(expectedPrefix) : key.length > 20;

    res.json({ valid, hint: valid ? maskKey(key) : null });
  } catch (err) { next(err); }
});
