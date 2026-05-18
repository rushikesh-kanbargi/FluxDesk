import { NextResponse, type NextRequest } from 'next/server'
import { withAuth } from '@/lib/server/auth'
import { callAI } from '@/lib/server/aiService'
import { getMemoryContext, buildPersonalisationContext, recordToolUsage } from '@/lib/server/memoryService'
import { TOOLS, type ToolId } from '@/lib/server/toolDefinitions'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError, createError } from '@/lib/server/errors'
import type { ToolSource } from '@prisma/client'

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
    try {
      const { toolId } = await params
      const tool = TOOLS[toolId as ToolId]
      if (!tool) throw createError('Unknown tool', 404)

      const body = await request.json()
      const { projectId, ...restBody } = body
      const input = tool.schema.parse(restBody)

      const memCtx = await getMemoryContext(userId)
      const personalisation = buildPersonalisationContext(memCtx)
      const system = tool.buildSystem(personalisation)
      const userMessage = buildUserMessage(toolId as ToolId, input)

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
          ...(projectId ? { projectId } : {}),
        },
      })

      recordToolUsage(
        userId,
        toolId,
        extractFramework(text, toolId) ?? undefined,
        provider,
        JSON.stringify(input)
      ).catch(() => {})

      return NextResponse.json({ output: text, usageId: usage.id, provider, durationMs })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}

function extractFramework(text: string, toolId: string): string | null {
  if (toolId === 'forge') {
    try {
      const j = JSON.parse(text.replace(/```json|```/g, '').trim())
      return j.framework || null
    } catch {
      return null
    }
  }
  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildUserMessage(toolId: ToolId, input: any): string {
  switch (toolId) {
    case 'forge':
      return `Raw idea: ${input.idea}\nCategory hint: ${input.category || 'auto-detect'}\nTarget AI: ${input.targetAi || 'Claude'}\nFramework override: ${input.framework || 'auto-pick best'}`
    case 'improver':
      return `Prompt to improve:\n${input.prompt}\n\nContext/purpose: ${input.context || 'not specified'}`
    case 'codeReview':
      return `Language/Framework: ${input.language || 'detect from code'}\nFocus: ${input.focus || 'general'}\n\nCode:\n\`\`\`\n${input.code}\n\`\`\``
    case 'bugTask':
      return `Product: ${input.product || 'not specified'}\nTicket format: ${input.format || 'linear'}\n\nRaw report:\n${input.rawReport}`
    case 'commit':
      return `Type hint: ${input.typeHint || 'auto-detect'}\nScope: ${input.scope || 'none'}\n\nDiff/description:\n${input.diff}`
    case 'featureSpec':
      return `Feature: ${input.idea}\nProduct: ${input.product || 'not specified'}\nAudience: ${input.audience || 'team'}`
    case 'standup':
      return `Yesterday: ${input.yesterday || 'not provided'}\nToday: ${input.today || 'not provided'}\nBlockers: ${input.blockers || 'none'}\nChannel: ${input.team || 'general'}\nTone: ${input.tone || 'concise'}`
    case 'adr':
      return `Decision to document: ${input.decision}\nContext: ${input.context || 'not provided'}\nOptions being considered: ${input.options || 'not specified'}`
    case 'techStack':
      return `Project type: ${input.projectType}\nTeam size: ${input.teamSize || 'not specified'}\nTimeline: ${input.timeline || 'not specified'}\nConstraints: ${input.constraints || 'none'}`
    case 'conceptExplainer':
      return `Concept: ${input.concept}\nDesired level: ${input.level || 'intermediate'}`
    case 'flashcards':
      return `Generate ${input.count || 8} flashcards. Style: ${input.style || 'qa'}.\n\nSource material:\n${input.content}`
    case 'compare':
      return `Prompt to compare across models:\n${input.prompt}\n\nContext: ${input.context || 'not provided'}`
    case 'meetingMirror':
      return `Meeting type: ${input.meetingType || 'not specified'}\n\nTranscript:\n${input.transcript}`
    case 'stakeholderTranslator':
      return `Audiences to rewrite for: ${input.audiences || 'all five (ceo, engineer, sales, customer, board)'}\n\nContent to translate:\n${input.content}`
    case 'decisionAutopsy':
      return `Decision: ${input.decision}\n\nContext: ${input.context || 'not provided'}`
    case 'silenceDetector':
      return `Medium: ${input.medium || 'not specified'}\n\nThread / transcript:\n${input.thread}`
    case 'complexityBudget':
      return `Team size: ${input.teamSize || 'not specified'}\n\nProject plan / roadmap:\n${input.plan}`
    case 'contextHandoff':
      return `Task: ${input.task}\n\nProgress so far:\n${input.progress}\n\nOpen items: ${input.openItems || 'not specified'}`
    case 'emailIntentDecoder':
      return `Relationship context: ${input.relationship || 'not specified'}\n\nEmail:\n${input.email}`
    case 'workBrainDump':
      return `Brain dump:\n${input.dump}`
    case 'feedbackTranslator':
      return `Context: ${input.context || 'not specified'}\n\nFeedback received:\n${input.feedback}`
    default:
      return JSON.stringify(input)
  }
}
