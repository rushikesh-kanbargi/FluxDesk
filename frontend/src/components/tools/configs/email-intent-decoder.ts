import type { ToolConfig } from './index'

export const emailIntentDecoderConfig: ToolConfig = {
  id: 'email-intent-decoder',
  name: 'Email Intent Decoder',
  icon: 'Mail',
  description: 'What do they actually want? Decoded subtext + 3 response options',
  category: 'Workplace',
  outputLabel: 'Email Analysis',
  fields: [
    {
      id: 'email',
      label: 'Email to decode',
      type: 'textarea',
      placeholder: 'Paste the email you received...',
      required: true,
      rows: 7,
    },
    {
      id: 'relationship',
      label: 'Your relationship to sender',
      type: 'select',
      options: [
        { value: 'manager', label: 'My manager' },
        { value: 'report', label: 'My direct report' },
        { value: 'peer', label: 'Peer / colleague' },
        { value: 'client', label: 'Client / customer' },
        { value: 'executive', label: 'Executive / leadership' },
        { value: 'vendor', label: 'Vendor / partner' },
        { value: 'other', label: 'Other' },
      ],
    },
  ],
}
