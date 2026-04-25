import type { ToolConfig } from './index'

export const compareConfig: ToolConfig = {
  id: 'compare',
  name: 'Model Comparator',
  icon: 'BarChart2',
  description: 'See how Claude, GPT-4o, and Gemini would approach your prompt',
  category: 'Learning',
  outputLabel: 'Model Comparison',
  fields: [
    {
      id: 'prompt',
      label: 'Prompt to compare',
      type: 'textarea',
      placeholder: 'Enter a prompt to see how different models would respond...',
      required: true,
      rows: 5,
    },
    {
      id: 'task',
      label: 'Task type',
      type: 'select',
      options: [
        { value: 'general', label: 'General' },
        { value: 'coding', label: 'Coding' },
        { value: 'reasoning', label: 'Reasoning' },
        { value: 'creative', label: 'Creative writing' },
        { value: 'analysis', label: 'Analysis' },
      ],
    },
  ],
}
