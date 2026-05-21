/**
 * Static post-run suggestion chains.
 *
 * Rule: only include a second chip if a real user would actually reach for
 * that tool next. One honest chip beats two manufactured ones.
 * Dynamic/ML-based chains are a v2 improvement once click data exists.
 */

export interface ToolSuggestion {
  toolId: string
  label: string // action-oriented: what the chip does, not the tool name
}

export const TOOL_CHAINS: Record<string, ToolSuggestion[]> = {
  // Prompting
  forge: [
    { toolId: 'improver', label: 'Refine this prompt' },
    { toolId: 'feature-spec', label: 'Turn into a spec' },
  ],
  improver: [
    // User just improved a prompt — they mostly copy and use it.
    // One chip: if the improvement missed, go back to forge.
    { toolId: 'forge', label: 'Rebuild from scratch' },
  ],

  // Development
  'code-review': [
    { toolId: 'commit',   label: 'Write the commit' },
    { toolId: 'bug-task', label: 'Log a bug' },
  ],
  'bug-task': [
    { toolId: 'commit',      label: 'Write the commit' },
    { toolId: 'code-review', label: 'Review the fix' },
  ],
  commit: [
    // commit→ADR is rare — most commits don't warrant one
    { toolId: 'code-review', label: 'Review the diff' },
  ],
  adr: [
    { toolId: 'feature-spec', label: 'Turn into a spec' },
    { toolId: 'tech-stack',   label: 'Compare options' },
  ],

  // Planning
  'feature-spec': [
    { toolId: 'adr',     label: 'Document the decisions' },
    { toolId: 'standup', label: 'Report what\'s planned' },
  ],
  standup: [
    // standup is often a final step — one honest next action
    { toolId: 'context-handoff', label: 'Create a handoff doc' },
  ],
  'tech-stack': [
    { toolId: 'adr',          label: 'Document the choice' },
    { toolId: 'feature-spec', label: 'Start the spec' },
  ],

  // Learning
  'concept-explainer': [
    { toolId: 'flashcards', label: 'Make flashcards' },
    { toolId: 'compare',    label: 'Compare with alternatives' },
  ],
  flashcards: [
    // flashcards is usually a terminal step in a learning session
    { toolId: 'concept-explainer', label: 'Go deeper' },
  ],
  compare: [
    { toolId: 'tech-stack', label: 'Get a recommendation' },
    { toolId: 'adr',        label: 'Document the choice' },
  ],

  // Workplace
  'meeting-mirror': [
    { toolId: 'standup',             label: 'Write the standup' },
    { toolId: 'feedback-translator', label: 'Parse the feedback' },
  ],
  'stakeholder-translator': [
    { toolId: 'email-intent-decoder', label: 'Decode the follow-up email' },
    { toolId: 'silence-detector',     label: 'Find what wasn\'t said' },
  ],
  'decision-autopsy': [
    { toolId: 'adr',          label: 'Document it properly' },
    { toolId: 'feature-spec', label: 'Restart with a better spec' },
  ],
  'silence-detector': [
    { toolId: 'stakeholder-translator', label: 'Translate the signals' },
    { toolId: 'feedback-translator',    label: 'Reframe as feedback' },
  ],
  'complexity-budget': [
    { toolId: 'adr',          label: 'Document scope decisions' },
    { toolId: 'feature-spec', label: 'Simplify the spec' },
  ],
  'context-handoff': [
    { toolId: 'standup', label: 'Write the standup' },
    { toolId: 'adr',     label: 'Document key decisions' },
  ],
  'email-intent-decoder': [
    { toolId: 'stakeholder-translator', label: 'Get full stakeholder context' },
    { toolId: 'feedback-translator',    label: 'Turn into actionable feedback' },
  ],
  'work-brain-dump': [
    { toolId: 'feature-spec', label: 'Shape into a spec' },
    { toolId: 'standup',      label: 'Summarize for standup' },
  ],
  'feedback-translator': [
    // feedback-translator is often a terminal step — one chip
    { toolId: 'stakeholder-translator', label: 'Get the full picture' },
  ],
}

/**
 * Extract a clean title for quick-save.
 *
 * Strategy (in order):
 *   1. First markdown heading  → "[Tool]: Heading text"
 *   2. First bold text         → "[Tool]: Bold text"
 *   3. Fallback                → "[Tool] · 21 May"  (never mid-sentence ugly)
 */
export function extractSaveTitle(output: string, toolName: string): string {
  const headingMatch = output.match(/^#{1,3}\s+(.+)/m)
  if (headingMatch) {
    return `${toolName}: ${headingMatch[1].trim().slice(0, 60)}`
  }

  const boldMatch = output.match(/\*\*(.+?)\*\*/)
  if (boldMatch) {
    return `${toolName}: ${boldMatch[1].trim().slice(0, 60)}`
  }

  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${toolName} · ${date}`
}
