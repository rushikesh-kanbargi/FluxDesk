import type { ToolConfig } from './index'

export const codeReviewConfig: ToolConfig = {
  id: 'code-review',
  name: 'Code Review Brief',
  icon: 'GitPullRequest',
  description: 'Get a structured review checklist: issues, warnings, and quick wins',
  category: 'Development',
  outputLabel: 'Review Report',
  fields: [
    {
      id: 'code',
      label: 'Code to review',
      type: 'code',
      placeholder: 'Paste your code here...',
      required: true,
      rows: 12,
    },
    {
      id: 'language',
      label: 'Language / framework',
      type: 'input',
      placeholder: 'e.g. TypeScript, React, Python...',
    },
    {
      id: 'context',
      label: 'Context (optional)',
      type: 'textarea',
      placeholder: 'What does this code do? Any specific concerns?',
      rows: 2,
    },
  ],
}
