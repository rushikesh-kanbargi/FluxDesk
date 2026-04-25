import type { ToolConfig } from './index'

export const feedbackTranslatorConfig: ToolConfig = {
  id: 'feedback-translator',
  name: 'Feedback Translator',
  icon: 'MessageCircle',
  description: 'Corporate feedback decoded: plain English + what to do + how to respond',
  category: 'Workplace',
  outputLabel: 'Decoded Feedback',
  fields: [
    {
      id: 'feedback',
      label: 'Feedback received',
      type: 'textarea',
      placeholder: 'Paste the feedback, review comment, or message you received...',
      required: true,
      rows: 5,
    },
    {
      id: 'source',
      label: 'Source of feedback',
      type: 'select',
      options: [
        { value: 'performance-review', label: 'Performance review' },
        { value: 'code-review', label: 'Code review comment' },
        { value: 'manager', label: 'Manager feedback' },
        { value: 'peer', label: 'Peer feedback' },
        { value: 'client', label: 'Client feedback' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      id: 'tone',
      label: 'How would you describe its tone?',
      type: 'select',
      options: [
        { value: 'unclear', label: 'Hard to read / unclear' },
        { value: 'positive', label: 'Seems positive' },
        { value: 'negative', label: 'Seems negative' },
        { value: 'mixed', label: 'Mixed signals' },
      ],
    },
  ],
}
