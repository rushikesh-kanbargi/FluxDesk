import type { ToolConfig } from './index'

export const decisionAutopsyConfig: ToolConfig = {
  id: 'decision-autopsy',
  name: 'Decision Autopsy',
  icon: 'AlertTriangle',
  description: "Pre-mortem your decision: risks, assumptions, and devil's advocate",
  category: 'Workplace',
  outputLabel: 'Decision Analysis',
  fields: [
    {
      id: 'decision',
      label: "Decision you're making",
      type: 'textarea',
      placeholder: "Describe the decision clearly — what you're choosing and why...",
      required: true,
      rows: 4,
    },
    {
      id: 'timeline',
      label: 'Timeline',
      type: 'input',
      placeholder: 'e.g. Deciding by Friday, implementing in Q1',
    },
    {
      id: 'stakes',
      label: "What's at stake",
      type: 'select',
      options: [
        { value: 'low', label: 'Low — easily reversible' },
        { value: 'medium', label: 'Medium — significant effort to reverse' },
        { value: 'high', label: 'High — major consequences' },
        { value: 'critical', label: 'Critical — irreversible or company-defining' },
      ],
    },
  ],
}
