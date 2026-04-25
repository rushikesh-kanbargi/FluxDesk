import type { ToolConfig } from './index'

export const forgeConfig: ToolConfig = {
  id: 'forge',
  name: 'PromptForge',
  icon: 'Zap',
  description: 'Transform raw ideas into structured, framework-optimized prompts',
  category: 'Prompting',
  flagship: true,
  outputLabel: 'Engineered Prompt',
  fields: [
    {
      id: 'idea',
      label: 'Your raw idea',
      type: 'textarea',
      placeholder: 'Describe what you want the AI to do. Be as raw and unstructured as you like — PromptForge handles the rest.',
      required: true,
      rows: 5,
    },
    {
      id: 'category',
      label: 'Use case category',
      type: 'select',
      options: [
        { value: 'coding', label: 'Coding & Development' },
        { value: 'writing', label: 'Writing & Content' },
        { value: 'analysis', label: 'Analysis & Research' },
        { value: 'creative', label: 'Creative' },
        { value: 'business', label: 'Business & Strategy' },
        { value: 'education', label: 'Education & Learning' },
        { value: 'data', label: 'Data & Analytics' },
      ],
    },
    {
      id: 'framework',
      label: 'Framework preference',
      type: 'select',
      options: [
        { value: 'auto', label: 'Auto-select (recommended)' },
        { value: 'RISEN', label: 'RISEN — Role, Instructions, Steps, End goal, Narrowing' },
        { value: 'CO-STAR', label: 'CO-STAR — Context, Objective, Style, Tone, Audience, Response' },
        { value: 'BAB', label: 'BAB — Before, After, Bridge' },
        { value: 'TRACE', label: 'TRACE — Task, Request, Action, Context, Example' },
        { value: 'ReAct', label: 'ReAct — Reasoning + Acting' },
        { value: 'Chain-of-Thought', label: 'Chain of Thought' },
      ],
    },
    {
      id: 'targetAi',
      label: 'Target AI model',
      type: 'select',
      options: [
        { value: 'any', label: 'Any model' },
        { value: 'claude', label: 'Claude' },
        { value: 'gpt4', label: 'GPT-4o' },
        { value: 'gemini', label: 'Gemini' },
      ],
    },
  ],
}
