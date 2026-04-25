import type { ToolConfig } from './index'

export const silenceDetectorConfig: ToolConfig = {
  id: 'silence-detector',
  name: 'Silence Detector',
  icon: 'EyeOff',
  description: 'Find dropped topics, ignored voices, and implied messages in threads',
  category: 'Workplace',
  outputLabel: 'Silence Analysis',
  fields: [
    {
      id: 'thread',
      label: 'Thread or conversation',
      type: 'textarea',
      placeholder: 'Paste a Slack thread, email chain, or meeting notes...',
      required: true,
      rows: 8,
    },
    {
      id: 'context',
      label: 'Context',
      type: 'input',
      placeholder: 'e.g. Post-incident review, product decision thread, team discussion',
    },
  ],
}
