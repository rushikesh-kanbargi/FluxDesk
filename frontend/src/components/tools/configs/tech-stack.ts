import type { ToolConfig } from './index'

export const techStackConfig: ToolConfig = {
  id: 'tech-stack',
  name: 'Tech Stack Advisor',
  icon: 'Layers',
  description: 'Constraints-driven tech stack recommendation with tradeoffs',
  category: 'Planning',
  outputLabel: 'Stack Recommendation',
  fields: [
    {
      id: 'description',
      label: 'What are you building?',
      type: 'textarea',
      placeholder: 'Describe your project: type, scale, team size, timeline...',
      required: true,
      rows: 4,
    },
    {
      id: 'constraints',
      label: 'Hard constraints',
      type: 'textarea',
      placeholder: 'e.g. Must use AWS, team knows Python, budget < $500/mo, solo dev',
      rows: 2,
    },
    {
      id: 'priorities',
      label: 'Priorities (rank order)',
      type: 'select',
      options: [
        { value: 'speed', label: 'Ship fast — development speed first' },
        { value: 'scale', label: 'Scale — built for growth' },
        { value: 'cost', label: 'Cost — minimize infrastructure spend' },
        { value: 'talent', label: 'Talent — hire for it easily' },
        { value: 'maintenance', label: 'Maintenance — minimize long-term burden' },
      ],
    },
  ],
}
