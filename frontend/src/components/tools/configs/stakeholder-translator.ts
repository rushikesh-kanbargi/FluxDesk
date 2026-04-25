import type { ToolConfig } from './index'

export const stakeholderTranslatorConfig: ToolConfig = {
  id: 'stakeholder-translator',
  name: 'Stakeholder Translator',
  icon: 'MessageSquare',
  description: 'Write once, get 5 versions: CEO, Engineer, Sales, Customer, Board',
  category: 'Workplace',
  outputLabel: 'Stakeholder Versions',
  fields: [
    {
      id: 'content',
      label: 'Your message or update',
      type: 'textarea',
      placeholder: 'Write your message once — FluxDesk translates it for each audience...',
      required: true,
      rows: 5,
    },
    {
      id: 'context',
      label: 'Context',
      type: 'input',
      placeholder: 'e.g. Product launch delay, new feature shipped, budget cut',
    },
  ],
}
