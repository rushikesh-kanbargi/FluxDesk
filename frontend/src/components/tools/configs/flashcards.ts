import type { ToolConfig } from './index'

export const flashcardsConfig: ToolConfig = {
  id: 'flashcards',
  name: 'Flashcard Factory',
  icon: 'CreditCard',
  description: 'Generate spaced-repetition flashcards from any text',
  category: 'Learning',
  outputLabel: 'Flashcard Set',
  fields: [
    {
      id: 'content',
      label: 'Source material',
      type: 'textarea',
      placeholder: 'Paste text, documentation, notes, or concepts to learn...',
      required: true,
      rows: 8,
    },
    {
      id: 'count',
      label: 'Number of cards',
      type: 'select',
      options: [
        { value: '5', label: '5 cards' },
        { value: '10', label: '10 cards' },
        { value: '15', label: '15 cards' },
        { value: '20', label: '20 cards' },
      ],
    },
    {
      id: 'difficulty',
      label: 'Focus',
      type: 'select',
      options: [
        { value: 'balanced', label: 'Balanced mix' },
        { value: 'definitions', label: 'Definitions & terms' },
        { value: 'concepts', label: 'Concepts & patterns' },
        { value: 'application', label: 'Application & examples' },
      ],
    },
  ],
}
