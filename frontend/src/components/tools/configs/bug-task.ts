import type { ToolConfig } from './index'

export const bugTaskConfig: ToolConfig = {
  id: 'bug-task',
  name: 'Bug → Task',
  icon: 'Bug',
  description: 'Transform messy bug reports into clean, actionable tickets',
  category: 'Development',
  outputLabel: 'Structured Ticket',
  fields: [
    {
      id: 'report',
      label: 'Raw bug report',
      type: 'textarea',
      placeholder: 'Paste the messy bug report, Slack message, or description...',
      required: true,
      rows: 5,
    },
    {
      id: 'priority',
      label: 'Suggested priority',
      type: 'select',
      options: [
        { value: 'auto', label: 'Auto-detect' },
        { value: 'critical', label: 'Critical — Production down' },
        { value: 'high', label: 'High — Major feature broken' },
        { value: 'medium', label: 'Medium — Workaround exists' },
        { value: 'low', label: 'Low — Minor / cosmetic' },
      ],
    },
  ],
}
