import type { ToolConfig } from './index'

export const conceptExplainerConfig: ToolConfig = {
  id: 'concept-explainer',
  name: 'Concept Explainer',
  icon: 'BookOpen',
  description: '5-level explanation ladder: ELI5 through expert',
  category: 'Learning',
  outputLabel: 'Multi-Level Explanation',
  fields: [
    {
      id: 'concept',
      label: 'Concept to explain',
      type: 'input',
      placeholder: 'e.g. WebSockets, CQRS, attention mechanism, Bayesian inference...',
      required: true,
    },
    {
      id: 'domain',
      label: 'Domain context',
      type: 'input',
      placeholder: 'e.g. web development, machine learning, distributed systems',
    },
    {
      id: 'startLevel',
      label: 'Start from level',
      type: 'select',
      options: [
        { value: 'all', label: 'All levels (ELI5 → Expert)' },
        { value: 'eli5', label: 'ELI5 — 5-year-old explanation' },
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' },
        { value: 'expert', label: 'Expert' },
      ],
    },
  ],
}
