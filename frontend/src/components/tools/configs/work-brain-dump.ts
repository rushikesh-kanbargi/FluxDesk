import type { ToolConfig } from './index'

export const workBrainDumpConfig: ToolConfig = {
  id: 'work-brain-dump',
  name: 'Work Brain Dump',
  icon: 'Brain',
  description: 'Organize a chaotic brain dump into tasks, decisions, and priorities',
  category: 'Workplace',
  outputLabel: 'Organized Tasks',
  fields: [
    {
      id: 'dump',
      label: 'Brain dump',
      type: 'textarea',
      placeholder: "Just dump everything that's on your work brain here. Messy is fine.",
      required: true,
      rows: 8,
    },
    {
      id: 'timeframe',
      label: 'Timeframe',
      type: 'select',
      options: [
        { value: 'today', label: 'Today' },
        { value: 'week', label: 'This week' },
        { value: 'sprint', label: 'This sprint' },
        { value: 'quarter', label: 'This quarter' },
      ],
    },
  ],
}
