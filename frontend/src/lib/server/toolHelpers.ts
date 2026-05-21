import type { ToolSource } from '@prisma/client'

/** Maps X-FluxDesk-Client header to the ToolSource enum value. */
export function parseSource(header: string | null): ToolSource {
  switch (header) {
    case 'vscode':      return 'VSCODE'
    case 'gmail-addon': return 'GMAIL'
    case 'chat-bot':    return 'CHATBOT'
    default:            return 'WEB'
  }
}

/**
 * Extracts the selected prompt framework from PromptForge JSON output.
 * Returns null for all other tools.
 */
export function extractFramework(text: string, toolId: string): string | null {
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

/** Builds the user-facing message sent to the AI for each tool. */
export function buildUserMessage(toolId: string, input: Record<string, unknown>): string {
  const str = (val: unknown, fallback = '') => (val != null ? String(val) : fallback)

  switch (toolId) {
    case 'forge':
      return `Raw idea: ${str(input.idea)}\nCategory hint: ${str(input.category, 'auto-detect')}\nTarget AI: ${str(input.targetAi, 'Claude')}\nFramework override: ${str(input.framework, 'auto-pick best')}`
    case 'improver':
      return `Prompt to improve:\n${str(input.prompt)}\n\nContext/purpose: ${str(input.context, 'not specified')}`
    case 'code-review':
      return `Language/Framework: ${str(input.language, 'detect from code')}\nFocus: ${str(input.focus, 'general')}\n\nCode:\n\`\`\`\n${str(input.code)}\n\`\`\``
    case 'bug-task':
      return `Product: ${str(input.product, 'not specified')}\nTicket format: ${str(input.format, 'linear')}\n\nRaw report:\n${str(input.rawReport)}`
    case 'commit':
      return `Type hint: ${str(input.typeHint, 'auto-detect')}\nScope: ${str(input.scope, 'none')}\n\nDiff/description:\n${str(input.diff)}`
    case 'feature-spec':
      return `Feature: ${str(input.idea)}\nProduct: ${str(input.product, 'not specified')}\nAudience: ${str(input.audience, 'team')}`
    case 'standup':
      return `Yesterday: ${str(input.yesterday, 'not provided')}\nToday: ${str(input.today, 'not provided')}\nBlockers: ${str(input.blockers, 'none')}\nChannel: ${str(input.team, 'general')}\nTone: ${str(input.tone, 'concise')}`
    case 'adr':
      return `Decision to document: ${str(input.decision)}\nContext: ${str(input.context, 'not provided')}\nOptions being considered: ${str(input.options, 'not specified')}`
    case 'tech-stack':
      return `Project type: ${str(input.projectType)}\nTeam size: ${str(input.teamSize, 'not specified')}\nTimeline: ${str(input.timeline, 'not specified')}\nConstraints: ${str(input.constraints, 'none')}`
    case 'concept-explainer':
      return `Concept: ${str(input.concept)}\nDesired level: ${str(input.level, 'intermediate')}`
    case 'flashcards':
      return `Generate ${str(input.count, '8')} flashcards. Style: ${str(input.style, 'qa')}.\n\nSource material:\n${str(input.content)}`
    case 'compare':
      return `Prompt to compare across models:\n${str(input.prompt)}\n\nContext: ${str(input.context, 'not provided')}`
    case 'meeting-mirror':
      return `Meeting type: ${str(input.meetingType, 'not specified')}\n\nTranscript:\n${str(input.transcript)}`
    case 'stakeholder-translator':
      return `Audiences to rewrite for: ${str(input.audiences, 'all five (ceo, engineer, sales, customer, board)')}\n\nContent to translate:\n${str(input.content)}`
    case 'decision-autopsy':
      return `Decision: ${str(input.decision)}\n\nContext: ${str(input.context, 'not provided')}`
    case 'silence-detector':
      return `Medium: ${str(input.medium, 'not specified')}\n\nThread / transcript:\n${str(input.thread)}`
    case 'complexity-budget':
      return `Team size: ${str(input.teamSize, 'not specified')}\n\nProject plan / roadmap:\n${str(input.plan)}`
    case 'context-handoff':
      return `Task: ${str(input.task)}\n\nProgress so far:\n${str(input.progress)}\n\nOpen items: ${str(input.openItems, 'not specified')}`
    case 'email-intent-decoder':
      return `Relationship context: ${str(input.relationship, 'not specified')}\n\nEmail:\n${str(input.email)}`
    case 'work-brain-dump':
      return `Brain dump:\n${str(input.dump)}`
    case 'feedback-translator':
      return `Context: ${str(input.context, 'not specified')}\n\nFeedback received:\n${str(input.feedback)}`
    default:
      return JSON.stringify(input)
  }
}
