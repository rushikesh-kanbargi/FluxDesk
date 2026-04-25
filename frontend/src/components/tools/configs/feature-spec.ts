import type { ToolConfig } from './index'

export const featureSpecConfig: ToolConfig = {
  id: 'feature-spec',
  name: 'Feature Spec',
  icon: 'ClipboardList',
  description: 'One-liner to full feature spec with user stories and acceptance criteria',
  category: 'Planning',
  outputLabel: 'Feature Specification',
  fields: [
    {
      id: 'feature',
      label: 'Feature idea',
      type: 'input',
      placeholder: 'e.g. Let users export their prompt library as a PDF',
      required: true,
    },
    {
      id: 'context',
      label: 'Product context',
      type: 'textarea',
      placeholder: 'Who is the user? What problem does this solve? What already exists?',
      rows: 3,
    },
    {
      id: 'constraints',
      label: 'Constraints & out of scope',
      type: 'textarea',
      placeholder: 'What should this NOT do? Any technical limitations?',
      rows: 2,
    },
  ],
}
