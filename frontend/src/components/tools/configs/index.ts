import { forgeConfig } from './forge'
import { improverConfig } from './improver'
import { codeReviewConfig } from './code-review'
import { bugTaskConfig } from './bug-task'
import { commitConfig } from './commit'
import { adrConfig } from './adr'
import { featureSpecConfig } from './feature-spec'
import { standupConfig } from './standup'
import { techStackConfig } from './tech-stack'
import { conceptExplainerConfig } from './concept-explainer'
import { flashcardsConfig } from './flashcards'
import { compareConfig } from './compare'
import { meetingMirrorConfig } from './meeting-mirror'
import { stakeholderTranslatorConfig } from './stakeholder-translator'
import { decisionAutopsyConfig } from './decision-autopsy'
import { silenceDetectorConfig } from './silence-detector'
import { complexityBudgetConfig } from './complexity-budget'
import { contextHandoffConfig } from './context-handoff'
import { emailIntentDecoderConfig } from './email-intent-decoder'
import { workBrainDumpConfig } from './work-brain-dump'
import { feedbackTranslatorConfig } from './feedback-translator'

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

export const TOOL_CONFIGS: Record<string, ToolConfig> = {
  forge: forgeConfig,
  improver: improverConfig,
  'code-review': codeReviewConfig,
  'bug-task': bugTaskConfig,
  commit: commitConfig,
  adr: adrConfig,
  'feature-spec': featureSpecConfig,
  standup: standupConfig,
  'tech-stack': techStackConfig,
  'concept-explainer': conceptExplainerConfig,
  flashcards: flashcardsConfig,
  compare: compareConfig,
  'meeting-mirror': meetingMirrorConfig,
  'stakeholder-translator': stakeholderTranslatorConfig,
  'decision-autopsy': decisionAutopsyConfig,
  'silence-detector': silenceDetectorConfig,
  'complexity-budget': complexityBudgetConfig,
  'context-handoff': contextHandoffConfig,
  'email-intent-decoder': emailIntentDecoderConfig,
  'work-brain-dump': workBrainDumpConfig,
  'feedback-translator': feedbackTranslatorConfig,
}

export const TOOL_CATEGORIES = {
  Prompting:   { color: '#F5A623', bgColor: 'rgba(245,166,35,0.10)',   borderColor: 'rgba(245,166,35,0.25)'   },
  Development: { color: '#34d399', bgColor: 'rgba(52,211,153,0.10)',   borderColor: 'rgba(52,211,153,0.25)'   },
  Planning:    { color: '#38bdf8', bgColor: 'rgba(56,189,248,0.10)',   borderColor: 'rgba(56,189,248,0.25)'   },
  Learning:    { color: '#a78bfa', bgColor: 'rgba(167,139,250,0.10)',  borderColor: 'rgba(167,139,250,0.25)'  },
  Workplace:   { color: '#fb923c', bgColor: 'rgba(251,146,60,0.10)',   borderColor: 'rgba(251,146,60,0.25)'   },
} as const

export const ALL_TOOLS: ToolConfig[] = Object.values(TOOL_CONFIGS)
