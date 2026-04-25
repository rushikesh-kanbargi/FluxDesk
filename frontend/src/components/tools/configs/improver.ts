import type { ToolConfig } from './index'

export const improverConfig: ToolConfig = {
  id: 'improver',
  name: 'Prompt Improver',
  icon: 'Sparkles',
  description: 'Score your prompt and get a rewritten, stronger version',
  category: 'Prompting',
  outputLabel: 'Improved Prompt',
  fields: [
    {
      id: 'prompt',
      label: 'Your existing prompt',
      type: 'textarea',
      placeholder: 'Paste the prompt you want to improve...',
      required: true,
      rows: 6,
    },
    {
      id: 'goal',
      label: 'What should the improved prompt achieve?',
      type: 'input',
      placeholder: 'e.g. Generate cleaner React components with TypeScript',
    },
  ],
}
