import type { ToolConfig } from './index'

export const standupConfig: ToolConfig = {
  id: 'standup',
  name: 'Standup Writer',
  icon: 'Users',
  description: 'Transform bullet points into polished Slack standup messages',
  category: 'Planning',
  outputLabel: 'Standup Message',
  fields: [
    {
      id: 'yesterday',
      label: 'Yesterday (bullets)',
      type: 'textarea',
      placeholder: '- Fixed auth bug\n- Reviewed 3 PRs\n- Design sync with Sarah',
      required: true,
      rows: 3,
    },
    {
      id: 'today',
      label: 'Today (bullets)',
      type: 'textarea',
      placeholder: '- Finish API integration\n- Write unit tests\n- Deploy to staging',
      required: true,
      rows: 3,
    },
    {
      id: 'blockers',
      label: 'Blockers (optional)',
      type: 'textarea',
      placeholder: 'Waiting on design approval for mobile nav',
      rows: 2,
    },
    {
      id: 'tone',
      label: 'Tone',
      type: 'select',
      options: [
        { value: 'professional', label: 'Professional' },
        { value: 'casual', label: 'Casual' },
        { value: 'concise', label: 'Ultra-concise' },
      ],
    },
  ],
}
