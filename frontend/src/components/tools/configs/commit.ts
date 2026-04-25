import type { ToolConfig } from './index'

export const commitConfig: ToolConfig = {
  id: 'commit',
  name: 'Commit Writer',
  icon: 'GitCommit',
  description: 'Generate conventional commits from diffs or descriptions',
  category: 'Development',
  outputLabel: 'Commit Message',
  fields: [
    {
      id: 'changes',
      label: 'What changed?',
      type: 'textarea',
      placeholder: 'Paste git diff, PR description, or just describe what you did...',
      required: true,
      rows: 6,
    },
    {
      id: 'type',
      label: 'Commit type',
      type: 'select',
      options: [
        { value: 'auto', label: 'Auto-detect' },
        { value: 'feat', label: 'feat — New feature' },
        { value: 'fix', label: 'fix — Bug fix' },
        { value: 'refactor', label: 'refactor — Code restructure' },
        { value: 'chore', label: 'chore — Maintenance' },
        { value: 'docs', label: 'docs — Documentation' },
        { value: 'test', label: 'test — Tests' },
        { value: 'perf', label: 'perf — Performance' },
      ],
    },
  ],
}
