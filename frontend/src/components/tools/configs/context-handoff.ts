import type { ToolConfig } from './index'

export const contextHandoffConfig: ToolConfig = {
  id: 'context-handoff',
  name: 'Context Handoff',
  icon: 'ArrowRightLeft',
  description: 'Generate a structured handoff doc: decisions, open questions, next steps',
  category: 'Workplace',
  outputLabel: 'Handoff Document',
  fields: [
    {
      id: 'task',
      label: 'Task or project',
      type: 'input',
      placeholder: 'What are you handing off?',
      required: true,
    },
    {
      id: 'progress',
      label: "Current status & what's done",
      type: 'textarea',
      placeholder: "What's been completed, what decisions were made, where things stand...",
      required: true,
      rows: 4,
    },
    {
      id: 'openItems',
      label: 'Open items & blockers',
      type: 'textarea',
      placeholder: "What's unresolved? What needs attention? Any risks?",
      rows: 3,
    },
    {
      id: 'nextPerson',
      label: 'Handoff to (role)',
      type: 'input',
      placeholder: 'e.g. Backend engineer, PM, QA team',
    },
  ],
}
