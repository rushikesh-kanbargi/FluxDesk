'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, Zap } from 'lucide-react'
import { Button, cn } from '@/components/ui'
import { useUIStore } from '@/store/uiStore'
import { useUpdateMemory } from '@/hooks/useMemory'
import { AI_PROVIDERS, type AIProvider } from '@/types'
import { useRouter } from 'next/navigation'

const ROLES = [
  'Software Engineer',
  'Frontend Developer',
  'Backend Engineer',
  'Full-Stack Developer',
  'Product Manager',
  'Designer',
  'Data Scientist',
  'DevOps / SRE',
  'Technical Writer',
  'Student / Learning',
]

const FIRST_TOOLS = [
  { id: 'forge',        label: 'PromptForge',   desc: 'Engineer better AI prompts',    icon: '⚡' },
  { id: 'code-review',  label: 'Code Review',   desc: 'Get structured code feedback',  icon: '🔍' },
  { id: 'commit',       label: 'Commit Writer', desc: 'Write conventional commits',     icon: '📝' },
  { id: 'meeting-mirror', label: 'Meeting Mirror', desc: 'Analyze your meetings',       icon: '🪞' },
]

export function OnboardingModal() {
  const {
    onboardingComplete,
    setOnboardingComplete,
    onboardingStep,
    setOnboardingStep,
    setActiveProvider,
  } = useUIStore()
  const updateMemory = useUpdateMemory()
  const router = useRouter()

  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('claude')
  const [selectedRole, setSelectedRole] = useState('')

  if (onboardingComplete) return null

  const handleProviderNext = () => {
    setActiveProvider(selectedProvider)
    setOnboardingStep(1)
  }

  const handleRoleNext = async () => {
    if (selectedRole) {
      await updateMemory.mutateAsync({ inferredRole: selectedRole })
    }
    setOnboardingStep(2)
  }

  const handleToolSelect = (toolId: string) => {
    setOnboardingComplete(true)
    router.push(`/tools/${toolId}`)
  }

  const handleSkip = () => {
    setOnboardingComplete(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-[rgba(0,0,0,0.7)] backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative w-full max-w-md bg-[#1f1f23] border border-[rgba(255,255,255,0.10)] rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[rgba(245,166,35,0.12)] border border-[rgba(245,166,35,0.25)] flex items-center justify-center">
              <Zap size={12} className="text-amber" />
            </div>
            <span id="onboarding-title" className="text-sm font-semibold text-ink">Welcome to FluxDesk</span>
          </div>
          <button
            onClick={handleSkip}
            aria-label="Close onboarding"
            className="p-1.5 rounded-md text-ink-dim hover:text-ink hover:bg-[rgba(255,255,255,0.06)] transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 px-6 pt-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                'h-1 rounded-full transition-all duration-300',
                i <= onboardingStep ? 'bg-amber' : 'bg-[rgba(255,255,255,0.08)]',
                i === onboardingStep ? 'flex-1' : 'w-8',
              )}
            />
          ))}
        </div>

        {/* Steps */}
        <div className="px-6 py-5">
          <AnimatePresence mode="wait">
            {onboardingStep === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-sm font-semibold text-ink mb-1">Choose your AI provider</h2>
                <p className="text-xs text-ink-dim mb-4">Select which AI powers your tools. You can change this anytime.</p>

                <div className="space-y-2">
                  {(Object.entries(AI_PROVIDERS) as [AIProvider, { label: string; color: string }][]).map(([key, info]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedProvider(key)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-150',
                        selectedProvider === key
                          ? 'border-[rgba(245,166,35,0.3)] bg-[rgba(245,166,35,0.06)]'
                          : 'border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.03)]',
                      )}
                    >
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: info.color }} />
                      <div className="flex-1">
                        <span className="text-sm text-ink">{info.label}</span>
                      </div>
                      {selectedProvider === key && (
                        <div className="w-4 h-4 rounded-full bg-amber flex items-center justify-center flex-shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#09090b]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <Button variant="primary" size="lg" className="w-full mt-5 gap-2" onClick={handleProviderNext}>
                  Continue <ChevronRight size={14} />
                </Button>
              </motion.div>
            )}

            {onboardingStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-sm font-semibold text-ink mb-1">What&apos;s your role?</h2>
                <p className="text-xs text-ink-dim mb-4">This helps personalize every tool&apos;s output for you.</p>

                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((role) => (
                    <button
                      key={role}
                      onClick={() => setSelectedRole(role)}
                      className={cn(
                        'p-2.5 rounded-lg border text-xs text-left transition-all duration-150',
                        selectedRole === role
                          ? 'border-[rgba(245,166,35,0.3)] bg-[rgba(245,166,35,0.06)] text-amber'
                          : 'border-[rgba(255,255,255,0.06)] text-ink-muted hover:border-[rgba(255,255,255,0.12)] hover:text-ink',
                      )}
                    >
                      {role}
                    </button>
                  ))}
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  className="w-full mt-5 gap-2"
                  onClick={handleRoleNext}
                  loading={updateMemory.isPending}
                >
                  Continue <ChevronRight size={14} />
                </Button>
                <button
                  onClick={() => setOnboardingStep(2)}
                  className="w-full text-center text-xs text-ink-dim mt-2 hover:text-ink transition-colors"
                >
                  Skip
                </button>
              </motion.div>
            )}

            {onboardingStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-sm font-semibold text-ink mb-1">Try your first tool</h2>
                <p className="text-xs text-ink-dim mb-4">Pick one to get started — you can use all 21 anytime.</p>

                <div className="space-y-2">
                  {FIRST_TOOLS.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => handleToolSelect(tool.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3.5 rounded-xl border text-left',
                        'border-[rgba(255,255,255,0.06)] hover:border-[rgba(245,166,35,0.2)] hover:bg-[rgba(245,166,35,0.04)]',
                        'transition-all duration-150 group',
                      )}
                    >
                      <span className="text-xl">{tool.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink">{tool.label}</p>
                        <p className="text-xs text-ink-dim mt-0.5">{tool.desc}</p>
                      </div>
                      <ChevronRight size={14} className="text-ink-dim opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleSkip}
                  className="w-full text-center text-xs text-ink-dim mt-4 hover:text-ink transition-colors"
                >
                  Skip — go to dashboard
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
