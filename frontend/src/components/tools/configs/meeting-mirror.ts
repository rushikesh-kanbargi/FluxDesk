import type { ToolConfig } from './index'

export const meetingMirrorConfig: ToolConfig = {
  id: 'meeting-mirror',
  name: 'Meeting Mirror',
  icon: 'Video',
  description: 'Honest meeting analysis: who dominated, what was decided, what was wasted',
  category: 'Workplace',
  outputLabel: 'Meeting Analysis',
  fields: [
    {
      id: 'transcript',
      label: 'Meeting transcript or notes',
      type: 'textarea',
      placeholder: 'Paste the meeting transcript, notes, or a summary of what happened...',
      required: true,
      rows: 8,
    },
    {
      id: 'participants',
      label: 'Participants (optional)',
      type: 'input',
      placeholder: 'e.g. Alice (PM), Bob (Eng), Carol (Design)',
    },
    {
      id: 'meetingType',
      label: 'Meeting type',
      type: 'select',
      options: [
        { value: 'general', label: 'General meeting' },
        { value: 'standup', label: 'Standup / sync' },
        { value: 'planning', label: 'Sprint / project planning' },
        { value: 'review', label: 'Review / retrospective' },
        { value: 'decision', label: 'Decision-making' },
        { value: 'client', label: 'Client / stakeholder' },
      ],
    },
  ],
}
