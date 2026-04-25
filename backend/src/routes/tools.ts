import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { callAI } from '../services/aiService';
import { getMemoryContext, buildPersonalisationContext, recordToolUsage } from '../services/memoryService';
import { TOOLS, ToolId } from '../services/toolDefinitions';
import { prisma } from '../prisma/client';
import { createError } from '../middleware/errorHandler';
import { z } from 'zod';

export const toolsRouter = Router();
toolsRouter.use(authenticate);

// Generic tool runner — handles all 21 tools
toolsRouter.post('/:toolId/run', async (req: AuthRequest, res, next) => {
  const { toolId } = req.params as { toolId: ToolId };
  const tool = TOOLS[toolId];
  if (!tool) { next(createError('Unknown tool', 404)); return; }

  try {
    const input = tool.schema.parse(req.body);

    // Build personalisation context from user memory
    const memCtx = await getMemoryContext(req.userId!);
    const personalisation = buildPersonalisationContext(memCtx);

    const system = tool.buildSystem(personalisation);
    const userMessage = buildUserMessage(toolId, input);

    const start = Date.now();
    const { text, provider } = await callAI({
      userId: req.userId!,
      system,
      messages: [{ role: 'user', content: userMessage }],
      maxTokens: 1500,
      preferredProvider: req.body.provider,
    });

    const durationMs = Date.now() - start;

    // Save usage record
    const usage = await prisma.toolUsage.create({
      data: {
        userId: req.userId!,
        toolId,
        input: input as any,
        output: text,
        provider,
        framework: extractFramework(text, toolId),
        durationMs,
      },
    });

    // Update memory async
    recordToolUsage(
      req.userId!,
      toolId,
      extractFramework(text, toolId) || undefined,
      provider,
      JSON.stringify(input)
    ).catch(() => {});

    res.json({ output: text, usageId: usage.id, provider, durationMs });
  } catch (err) { next(err); }
});

// Rate a tool output (thumbs up / down)
toolsRouter.post('/usage/:usageId/rate', async (req: AuthRequest, res, next) => {
  try {
    const { rating } = z.object({ rating: z.number().min(1).max(5) }).parse(req.body);
    const usage = await prisma.toolUsage.findFirst({
      where: { id: req.params.usageId, userId: req.userId! },
    });
    if (!usage) { next(createError('Not found', 404)); return; }
    await prisma.toolUsage.update({ where: { id: usage.id }, data: { rating } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Get recent history for a tool
toolsRouter.get('/:toolId/history', async (req: AuthRequest, res, next) => {
  try {
    const { toolId } = req.params;
    const history = await prisma.toolUsage.findMany({
      where: { userId: req.userId!, toolId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, input: true, output: true, provider: true, durationMs: true, rating: true, createdAt: true },
    });
    res.json(history);
  } catch (err) { next(err); }
});

// Get all tools metadata
toolsRouter.get('/', async (_req, res) => {
  res.json(Object.values(TOOLS).map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
  })));
});

// ── Helpers ──

function extractFramework(text: string, toolId: string): string | null {
  if (toolId === 'forge') {
    try {
      const j = JSON.parse(text.replace(/```json|```/g, '').trim());
      return j.framework || null;
    } catch { return null; }
  }
  return null;
}

function buildUserMessage(toolId: ToolId, input: any): string {
  switch (toolId) {
    case 'forge':
      return `Raw idea: ${input.idea}\nCategory hint: ${input.category || 'auto-detect'}\nTarget AI: ${input.targetAi || 'Claude'}\nFramework override: ${input.framework || 'auto-pick best'}`;
    case 'improver':
      return `Prompt to improve:\n${input.prompt}\n\nContext/purpose: ${input.context || 'not specified'}`;
    case 'codeReview':
      return `Language/Framework: ${input.language || 'detect from code'}\nFocus: ${input.focus || 'general'}\n\nCode:\n\`\`\`\n${input.code}\n\`\`\``;
    case 'bugTask':
      return `Product: ${input.product || 'not specified'}\nTicket format: ${input.format || 'linear'}\n\nRaw report:\n${input.rawReport}`;
    case 'commit':
      return `Type hint: ${input.typeHint || 'auto-detect'}\nScope: ${input.scope || 'none'}\n\nDiff/description:\n${input.diff}`;
    case 'featureSpec':
      return `Feature: ${input.idea}\nProduct: ${input.product || 'not specified'}\nAudience: ${input.audience || 'team'}`;
    case 'standup':
      return `Yesterday: ${input.yesterday || 'not provided'}\nToday: ${input.today || 'not provided'}\nBlockers: ${input.blockers || 'none'}\nChannel: ${input.team || 'general'}\nTone: ${input.tone || 'concise'}`;
    case 'adr':
      return `Decision to document: ${input.decision}\nContext: ${input.context || 'not provided'}\nOptions being considered: ${input.options || 'not specified'}`;
    case 'techStack':
      return `Project type: ${input.projectType}\nTeam size: ${input.teamSize || 'not specified'}\nTimeline: ${input.timeline || 'not specified'}\nConstraints: ${input.constraints || 'none'}`;
    case 'conceptExplainer':
      return `Concept: ${input.concept}\nDesired level: ${input.level || 'intermediate'}`;
    case 'flashcards':
      return `Generate ${input.count || 8} flashcards. Style: ${input.style || 'qa'}.\n\nSource material:\n${input.content}`;
    case 'compare':
      return `Prompt to compare across models:\n${input.prompt}\n\nContext: ${input.context || 'not provided'}`;
    case 'meetingMirror':
      return `Meeting type: ${input.meetingType || 'not specified'}\n\nTranscript:\n${input.transcript}`;
    case 'stakeholderTranslator':
      return `Audiences to rewrite for: ${input.audiences ? input.audiences.join(', ') : 'all five (ceo, engineer, sales, customer, board)'}\n\nContent to translate:\n${input.content}`;
    case 'decisionAutopsy':
      return `Decision: ${input.decision}\n\nContext: ${input.context || 'not provided'}`;
    case 'silenceDetector':
      return `Medium: ${input.medium || 'not specified'}\n\nThread / transcript:\n${input.thread}`;
    case 'complexityBudget':
      return `Team size: ${input.teamSize || 'not specified'}\n\nProject plan / roadmap:\n${input.plan}`;
    case 'contextHandoff':
      return `Task: ${input.task}\n\nProgress so far:\n${input.progress}\n\nOpen items: ${input.openItems || 'not specified'}`;
    case 'emailIntentDecoder':
      return `Relationship context: ${input.relationship || 'not specified'}\n\nEmail:\n${input.email}`;
    case 'workBrainDump':
      return `Brain dump:\n${input.dump}`;
    case 'feedbackTranslator':
      return `Context: ${input.context || 'not specified'}\n\nFeedback received:\n${input.feedback}`;
    default:
      return JSON.stringify(input);
  }
}
