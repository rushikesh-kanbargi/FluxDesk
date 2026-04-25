import type { ToolConfig } from './index'

export const adrConfig: ToolConfig = {
  id: 'adr',
  name: 'ADR Generator',
  icon: 'FileText',
  description: 'Document architecture decisions with full context and consequences',
  category: 'Development',
  outputLabel: 'Architecture Decision Record',
  fields: [
    {
      id: 'decision',
      label: 'Decision being made',
      type: 'textarea',
      placeholder: 'Describe the architectural decision you made or are considering...',
      required: true,
      rows: 4,
    },
    {
      id: 'context',
      label: 'Context & constraints',
      type: 'textarea',
      placeholder: 'What drove this decision? Technical constraints, team size, deadlines...',
      rows: 3,
    },
    {
      id: 'alternatives',
      label: 'Alternatives considered',
      type: 'textarea',
      placeholder: 'What other options did you evaluate?',
      rows: 2,
    },
  ],
}
