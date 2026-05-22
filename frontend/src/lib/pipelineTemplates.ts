/**
 * Pre-built pipeline templates — static, version-controlled, staff-curated.
 *
 * Template storage decision (v1): static TypeScript array.
 * Rationale: templates are product decisions that belong in code review.
 * "Edit without a deploy" is a risk at this stage, not a benefit.
 * DB-backed templates with isTemplate flag are a v2 decision once user-submitted
 * templates are in scope.
 *
 * Input mapping syntax (pipelineEngine.ts):
 *   {{initial_input}}   — the runtime input provided by the user at run time
 *   {{step_N.output}}   — the output of step N (1-indexed)
 *   ""                  — optional field, left blank for user to fill at runtime
 */

export interface PipelineTemplateStep {
  toolId: string
  order: number
  inputMapping: Record<string, string>
}

export interface PipelineTemplate {
  id: string
  name: string
  description: string
  category: 'Developer' | 'Planning' | 'Prompting' | 'Workplace'
  /** Ordered tool IDs for display (chips, step count) */
  toolIds: string[]
  steps: PipelineTemplateStep[]
}

export const PIPELINE_TEMPLATES: PipelineTemplate[] = [
  // ── Developer ─────────────────────────────────────────────────────────────

  {
    id: 'code-review-to-commit',
    name: 'Code Review to Commit',
    description: 'Review a diff, then generate the conventional commit message.',
    category: 'Developer',
    toolIds: ['code-review', 'commit'],
    steps: [
      {
        toolId: 'code-review',
        order: 1,
        inputMapping: {
          code:     '{{initial_input}}',
          language: '',
          context:  '',
        },
      },
      {
        toolId: 'commit',
        order: 2,
        inputMapping: {
          changes: '{{step_1.output}}',
          type:    '',
        },
      },
    ],
  },

  {
    id: 'bug-to-fix',
    name: 'Bug to Fix',
    description: 'Turn a bug report into a structured ticket, then write the fix commit.',
    category: 'Developer',
    toolIds: ['bug-task', 'commit'],
    steps: [
      {
        toolId: 'bug-task',
        order: 1,
        inputMapping: {
          report:   '{{initial_input}}',
          priority: '',
        },
      },
      {
        toolId: 'commit',
        order: 2,
        inputMapping: {
          changes: '{{step_1.output}}',
          type:    'fix',
        },
      },
    ],
  },

  // ── Planning ──────────────────────────────────────────────────────────────

  {
    id: 'feature-planning',
    name: 'Feature Planning',
    description: 'Write a feature spec, then document the architectural decision.',
    category: 'Planning',
    toolIds: ['feature-spec', 'adr'],
    steps: [
      {
        toolId: 'feature-spec',
        order: 1,
        inputMapping: {
          feature:     '{{initial_input}}',
          context:     '',
          constraints: '',
        },
      },
      {
        toolId: 'adr',
        order: 2,
        inputMapping: {
          decision:     '{{initial_input}}',
          context:      '{{step_1.output}}',
          alternatives: '',
        },
      },
    ],
  },

  {
    id: 'tech-stack-decision',
    name: 'Tech Stack Decision',
    description: 'Evaluate technology options, then record the decision as an ADR.',
    category: 'Planning',
    toolIds: ['tech-stack', 'adr'],
    steps: [
      {
        toolId: 'tech-stack',
        order: 1,
        inputMapping: {
          description:  '{{initial_input}}',
          constraints:  '',
          priorities:   '',
        },
      },
      {
        toolId: 'adr',
        order: 2,
        inputMapping: {
          decision:     '{{initial_input}}',
          context:      '{{step_1.output}}',
          alternatives: '',
        },
      },
    ],
  },

  // ── Prompting ─────────────────────────────────────────────────────────────

  {
    id: 'prompt-workshop',
    name: 'Prompt Workshop',
    description: 'Forge a prompt from an idea, then refine it for production use.',
    category: 'Prompting',
    toolIds: ['forge', 'improver'],
    steps: [
      {
        toolId: 'forge',
        order: 1,
        inputMapping: {
          idea:      '{{initial_input}}',
          category:  '',
          framework: '',
        },
      },
      {
        toolId: 'improver',
        order: 2,
        inputMapping: {
          prompt: '{{step_1.output}}',
          goal:   '',
        },
      },
    ],
  },

  // ── Workplace ─────────────────────────────────────────────────────────────

  {
    id: 'meeting-debrief',
    name: 'Meeting Debrief',
    description: 'Extract meeting insights, write the standup update, then create a handoff doc.',
    category: 'Workplace',
    toolIds: ['meeting-mirror', 'standup', 'context-handoff'],
    steps: [
      {
        toolId: 'meeting-mirror',
        order: 1,
        inputMapping: {
          transcript:  '{{initial_input}}',
          participants: '',
          meetingType: '',
        },
      },
      {
        toolId: 'standup',
        order: 2,
        inputMapping: {
          yesterday: '{{step_1.output}}',
          today:     '',
          blockers:  '',
          tone:      '',
        },
      },
      {
        toolId: 'context-handoff',
        order: 3,
        inputMapping: {
          task:       '{{initial_input}}',
          progress:   '{{step_1.output}}',
          openItems:  '{{step_2.output}}',
          nextPerson: '',
        },
      },
    ],
  },
]

export const PIPELINE_TEMPLATE_MAP: Record<string, PipelineTemplate> =
  Object.fromEntries(PIPELINE_TEMPLATES.map((t) => [t.id, t]))
