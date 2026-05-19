import { NextResponse, type NextRequest } from 'next/server'
import { withAuth } from '@/lib/server/auth'
import { callAI } from '@/lib/server/aiService'
import { getMemoryContext, buildPersonalisationContext, recordToolUsage } from '@/lib/server/memoryService'
import { getToolById } from '@/lib/server/toolDefinitions'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError, createError } from '@/lib/server/errors'
import { checkRateLimit } from '@/lib/server/rateLimit'
import type { ToolSource } from '@prisma/client'

const TOOL_IDS = {
  FORGE: 'forge',
  IMPROVER: 'improver',
  CODE_REVIEW: 'code-review',
  BUG_TASK: 'bug-task',
  COMMIT: 'commit',
  FEATURE_SPEC: 'feature-spec',
  STANDUP: 'standup',
  ADR: 'adr',
  TECH_STACK: 'tech-stack',
  CONCEPT_EXPLAINER: 'concept-explainer',
  FLASHCARDS: 'flashcards',
  COMPARE: 'compare',
  MEETING_MIRROR: 'meeting-mirror',
  STAKEHOLDER_TRANSLATOR: 'stakeholder-translator',
  DECISION_AUTOPSY: 'decision-autopsy',
  SILENCE_DETECTOR: 'silence-detector',
  COMPLEXITY_BUDGET: 'complexity-budget',
  CONTEXT_HANDOFF: 'context-handoff',
  EMAIL_INTENT_DECODER: 'email-intent-decoder',
  WORK_BRAIN_DUMP: 'work-brain-dump',
  FEEDBACK_TRANSLATOR: 'feedback-translator',
} as const

function parseSource(header: string | null): ToolSource {
  switch (header) {
    case 'vscode':      return 'VSCODE'
    case 'gmail-addon': return 'GMAIL'
    case 'chat-bot':    return 'CHATBOT'
    default:            return 'WEB'
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  return withAuth(request, async (userId) => {
    if (!checkRateLimit(`tool:${userId}`, 10, 60_000)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }
    try {
      const { toolId } = await params
      const tool = getToolById(toolId)
      if (!tool) throw createError('Unknown tool', 404)

      const body = await request.json()
      const { projectId, ...restBody } = body

      // Validate projectId belongs to this user before writing
      let resolvedProjectId: string | undefined
      if (projectId && typeof projectId === 'string') {
        const project = await prisma.project.findFirst({ where: { id: projectId, userId } })
        if (project) resolvedProjectId = project.id
        // Silently ignore invalid/unauthorized projectId rather than failing the run
      }

      const input = tool.schema.parse(restBody)

      const memCtx = await getMemoryContext(userId)
      const personalisation = buildPersonalisationContext(memCtx)
      const system = tool.buildSystem(personalisation)
      const userMessage = buildUserMessage(tool.id, input)

      const start = Date.now()
      const { text, provider } = await callAI({
        userId,
        system,
        messages: [{ role: 'user', content: userMessage }],
        maxTokens: 1500,
        preferredProvider: restBody.preferredProvider ?? restBody.provider,
      })
      const durationMs = Date.now() - start

      const source = parseSource(request.headers.get('X-FluxDesk-Client'))

      const usage = await prisma.toolUsage.create({
        data: {
          userId,
          toolId,
          input: JSON.parse(JSON.stringify(input)),
          output: text,
          provider,
          framework: extractFramework(text, toolId),
          durationMs,
          source,
          ...(resolvedProjectId ? { projectId: resolvedProjectId } : {}),
        },
      })

      recordToolUsage(
        userId,
        toolId,
        extractFramework(text, toolId) ?? undefined,
        provider,
        JSON.stringify(input)
      ).catch((err: unknown) => console.error('[background]', err))

      return NextResponse.json({ output: text, usageId: usage.id, provider, durationMs })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}

function extractFramework(text: string, toolId: string): string | null {
  if (toolId === TOOL_IDS.FORGE) {
    try {
      const j = JSON.parse(text.replace(/```json|```/g, '').trim())
      return j.framework || null
    } catch {
      return null
    }
  }
  return null
}

function buildUserMessage(toolId: string, input: Record<string, unknown>): string {
  const str = (val: unknown, fallback = '') => (val != null ? String(val) : fallback)
  switch (toolId) {
    case TOOL_IDS.FORGE:
      return `Raw idea: ${str(input.idea)}\nCategory hint: ${str(input.category, 'auto-detect')}\nTarget AI: ${str(input.targetAi, 'Claude')}\nFramework override: ${str(input.framework, 'auto-pick best')}`
    case TOOL_IDS.IMPROVER:
      return `Prompt to improve:\n${str(input.prompt)}\n\nContext/purpose: ${str(input.context, 'not specified')}`
    case TOOL_IDS.CODE_REVIEW:
      return `Language/Framework: ${str(input.language, 'detect from code')}\nFocus: ${str(input.focus, 'general')}\n\nCode:\n\`\`\`\n${str(input.code)}\n\`\`\``
    case TOOL_IDS.BUG_TASK:
      return `Product: ${str(input.product, 'not specified')}\nTicket format: ${str(input.format, 'linear')}\n\nRaw report:\n${str(input.rawReport)}`
    case TOOL_IDS.COMMIT:
      return `Type hint: ${str(input.typeHint, 'auto-detect')}\nScope: ${str(input.scope, 'none')}\n\nDiff/description:\n${str(input.diff)}`
    case TOOL_IDS.FEATURE_SPEC:
      return `Feature: ${str(input.idea)}\nProduct: ${str(input.product, 'not specified')}\nAudience: ${str(input.audience, 'team')}`
    case TOOL_IDS.STANDUP:
      return `Yesterday: ${str(input.yesterday, 'not provided')}\nToday: ${str(input.today, 'not provided')}\nBlockers: ${str(input.blockers, 'none')}\nChannel: ${str(input.team, 'general')}\nTone: ${str(input.tone, 'concise')}`
    case TOOL_IDS.ADR:
      return `Decision to document: ${str(input.decision)}\nContext: ${str(input.context, 'not provided')}\nOptions being considered: ${str(input.options, 'not specified')}`
    case TOOL_IDS.TECH_STACK:
      return `Project type: ${str(input.projectType)}\nTeam size: ${str(input.teamSize, 'not specified')}\nTimeline: ${str(input.timeline, 'not specified')}\nConstraints: ${str(input.constraints, 'none')}`
    case TOOL_IDS.CONCEPT_EXPLAINER:
      return `Concept: ${str(input.concept)}\nDesired level: ${str(input.level, 'intermediate')}`
    case TOOL_IDS.FLASHCARDS:
      return `Generate ${str(input.count, '8')} flashcards. Style: ${str(input.style, 'qa')}.\n\nSource material:\n${str(input.content)}`
    case TOOL_IDS.COMPARE:
      return `Prompt to compare across models:\n${str(input.prompt)}\n\nContext: ${str(input.context, 'not provided')}`
    case TOOL_IDS.MEETING_MIRROR:
      return `Meeting type: ${str(input.meetingType, 'not specified')}\n\nTranscript:\n${str(input.transcript)}`
    case TOOL_IDS.STAKEHOLDER_TRANSLATOR:
      return `Audiences to rewrite for: ${str(input.audiences, 'all five (ceo, engineer, sales, customer, board)')}\n\nContent to translate:\n${str(input.content)}`
    case TOOL_IDS.DECISION_AUTOPSY:
      return `Decision: ${str(input.decision)}\n\nContext: ${str(input.context, 'not provided')}`
    case TOOL_IDS.SILENCE_DETECTOR:
      return `Medium: ${str(input.medium, 'not specified')}\n\nThread / transcript:\n${str(input.thread)}`
    case TOOL_IDS.COMPLEXITY_BUDGET:
      return `Team size: ${str(input.teamSize, 'not specified')}\n\nProject plan / roadmap:\n${str(input.plan)}`
    case TOOL_IDS.CONTEXT_HANDOFF:
      return `Task: ${str(input.task)}\n\nProgress so far:\n${str(input.progress)}\n\nOpen items: ${str(input.openItems, 'not specified')}`
    case TOOL_IDS.EMAIL_INTENT_DECODER:
      return `Relationship context: ${str(input.relationship, 'not specified')}\n\nEmail:\n${str(input.email)}`
    case TOOL_IDS.WORK_BRAIN_DUMP:
      return `Brain dump:\n${str(input.dump)}`
    case TOOL_IDS.FEEDBACK_TRANSLATOR:
      return `Context: ${str(input.context, 'not specified')}\n\nFeedback received:\n${str(input.feedback)}`
    default:
      return JSON.stringify(input)
  }
}
