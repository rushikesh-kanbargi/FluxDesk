import type { ToolConfig } from './index'

export const prDescConfig: ToolConfig = {
  id: 'pr-desc',
  name: 'PR Description',
  icon: 'GitPullRequest',
  description: 'Turn a diff or change summary into a structured PR description',
  category: 'Development',
  outputLabel: 'PR Description',
  fields: [
    {
      id: 'diff',
      label: 'Diff or change summary',
      type: 'code',
      placeholder: 'Paste your git diff, or describe what changed...',
      required: true,
      rows: 12,
    },
    {
      id: 'title',
      label: 'Suggested PR title (optional)',
      type: 'input',
      placeholder: 'e.g. feat(auth): add OAuth2 login',
    },
    {
      id: 'ticket',
      label: 'Issue / ticket reference (optional)',
      type: 'input',
      placeholder: 'e.g. JIRA-123 or #456',
    },
  ],
}
