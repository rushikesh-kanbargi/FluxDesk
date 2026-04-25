export interface User {
  id: string
  email: string
  username: string
  displayName?: string
  avatarUrl?: string
  role: 'USER' | 'ADMIN'
}

export interface UserMemory {
  id: string
  userId: string
  frameworkAffinities: Record<string, number>
  providerAffinities: Record<string, number>
  toolFrequency: Record<string, number>
  inferredStack: string[]
  inferredRole?: string
  inferredDomain?: string
  writingStyle?: string
  outputLength?: string
  notes: string[]
  updatedAt: string
}

export interface Prompt {
  id: string
  userId: string
  title: string
  body: string
  framework?: string
  tags: string[]
  starred: boolean
  usageCount: number
  toolId?: string
  provider?: string
  createdAt: string
  updatedAt: string
}

export interface ToolUsage {
  id: string
  userId: string
  toolId: string
  input: Record<string, unknown>
  output: string
  provider: string
  durationMs: number
  rating?: number
  createdAt: string
}

export interface ToolConfig {
  id: string
  name: string
  icon: string
  description: string
  category: 'Prompting' | 'Development' | 'Planning' | 'Learning' | 'Workplace'
  fields: ToolField[]
  outputLabel: string
  flagship?: boolean
}

export interface ToolField {
  id: string
  label: string
  type: 'textarea' | 'input' | 'select' | 'code'
  placeholder?: string
  required?: boolean
  rows?: number
  options?: Array<{ value: string; label: string }>
}

export interface DashboardStats {
  totalPrompts: number
  todayUsage: number
  libraryCount: number
  activeProvider: string
  topTools: Array<{ toolId: string; count: number }>
  recentUsage: ToolUsage[]
}

export type AIProvider = 'claude' | 'openai' | 'gemini' | 'groq'

export const AI_PROVIDERS: Record<AIProvider, { label: string; color: string }> = {
  claude:  { label: 'Claude',  color: '#F5A623' },
  openai:  { label: 'GPT-4o',  color: '#34d399' },
  gemini:  { label: 'Gemini',  color: '#38bdf8' },
  groq:    { label: 'Llama',   color: '#a78bfa' },
}

/** Prisma / API use `AIProvider` enum in uppercase; UI uses lowercase `AIProvider` keys. */
export function toApiProviderEnum(
  provider: string,
): 'CLAUDE' | 'OPENAI' | 'GEMINI' | 'GROQ' {
  return provider.toUpperCase() as 'CLAUDE' | 'OPENAI' | 'GEMINI' | 'GROQ'
}
