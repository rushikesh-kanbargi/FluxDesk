import type { ToolConfig } from './index'

export const complexityBudgetConfig: ToolConfig = {
  id: 'complexity-budget',
  name: 'Complexity Budget',
  icon: 'TrendingUp',
  description: 'Analyze your project plan and find what will break first',
  category: 'Workplace',
  outputLabel: 'Complexity Analysis',
  fields: [
    {
      id: 'plan',
      label: 'Project plan or proposal',
      type: 'textarea',
      placeholder: 'Describe your project: features, timeline, team, dependencies...',
      required: true,
      rows: 6,
    },
    {
      id: 'teamSize',
      label: 'Team size',
      type: 'select',
      options: [
        { value: 'solo', label: 'Solo (1 person)' },
        { value: 'small', label: 'Small (2-5)' },
        { value: 'medium', label: 'Medium (6-15)' },
        { value: 'large', label: 'Large (15+)' },
      ],
    },
  ],
}
