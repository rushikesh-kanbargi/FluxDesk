'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTourStore, type TourStep } from '@/store/tourStore'
import { apiPost } from '@/lib/api'

// ─── Tour step definitions ────────────────────────────────────────────────────

interface StepConfig {
  target: string | null  // data-tour value, null = no target (welcome/complete)
  title: string
  body: string
  placement: 'top' | 'bottom' | 'left' | 'right'
}

const STEP_CONFIGS: Record<TourStep, StepConfig> = {
  welcome: {
    target: null,
    title: 'Welcome to FluxDesk',
    body: 'Your personal AI workspace. Run tools, save prompts, and let FluxDesk learn how you work.',
    placement: 'bottom',
  },
  'api-keys': {
    target: 'api-keys',
    title: 'Start here',
    body: "Add your Claude or OpenAI key. FluxDesk never stores it in plaintext — it's encrypted with AES-256.",
    placement: 'right',
  },
  tools: {
    target: 'tools',
    title: '21 AI tools',
    body: 'Tools for writing, coding, research, and more. Pick one and run it in seconds.',
    placement: 'right',
  },
  library: {
    target: 'library',
    title: 'Your prompt library',
    body: 'Save any output you want to keep. Build your personal library over time.',
    placement: 'right',
  },
  memory: {
    target: 'memory',
    title: 'FluxDesk learns your style',
    body: "Role, domain, preferences — it adapts as you work. You're always in control.",
    placement: 'right',
  },
  complete: {
    target: null,
    title: "You're set up",
    body: 'Go run your first tool.',
    placement: 'bottom',
  },
}

const COACH_MARK_STEPS: TourStep[] = ['api-keys', 'tools', 'library', 'memory']

// ─── Target rect helper ───────────────────────────────────────────────────────

function getTargetRect(tourAttr: string): DOMRect | null {
  const el = document.querySelector(`[data-tour="${tourAttr}"]`)
  if (!el) return null
  return el.getBoundingClientRect()
}

// ─── Tooltip positioning ──────────────────────────────────────────────────────

interface TooltipPosition {
  top: number
  left: number
  arrowSide: 'top' | 'bottom' | 'left' | 'right'
}

const TOOLTIP_WIDTH = 280
const TOOLTIP_OFFSET = 16

function computePosition(rect: DOMRect, placement: StepConfig['placement'], isMobile: boolean): TooltipPosition {
  if (isMobile) {
    return {
      top: window.innerHeight - 240,
      left: (window.innerWidth - TOOLTIP_WIDTH) / 2,
      arrowSide: 'bottom',
    }
  }

  let top = 0
  let left = 0
  let arrowSide: TooltipPosition['arrowSide'] = 'left'

  switch (placement) {
    case 'right':
      top = rect.top + rect.height / 2 - 80
      left = rect.right + TOOLTIP_OFFSET
      arrowSide = 'left'
      break
    case 'left':
      top = rect.top + rect.height / 2 - 80
      left = rect.left - TOOLTIP_WIDTH - TOOLTIP_OFFSET
      arrowSide = 'right'
      break
    case 'bottom':
      top = rect.bottom + TOOLTIP_OFFSET
      left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2
      arrowSide = 'top'
      break
    case 'top':
      top = rect.top - 160 - TOOLTIP_OFFSET
      left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2
      arrowSide = 'bottom'
      break
  }

  // Clamp to viewport
  left = Math.max(12, Math.min(left, window.innerWidth - TOOLTIP_WIDTH - 12))
  top = Math.max(12, Math.min(top, window.innerHeight - 200))

  return { top, left, arrowSide }
}

// ─── Progress dots ────────────────────────────────────────────────────────────

const ORDERED_STEPS: TourStep[] = ['welcome', 'api-keys', 'tools', 'library', 'memory']

function ProgressDots({ current }: { current: TourStep }) {
  const idx = ORDERED_STEPS.indexOf(current)
  return (
    <div className="flex items-center justify-center gap-1.5 mt-3">
      {ORDERED_STEPS.map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? 'w-4 bg-white' : 'w-1.5 bg-white/30'
            }`}
        />
      ))}
    </div>
  )
}

// ─── Arrow ────────────────────────────────────────────────────────────────────

function TooltipArrow({ side }: { side: TooltipPosition['arrowSide'] }) {
  const base = 'absolute w-0 h-0 border-transparent'
  const styles: Record<TooltipPosition['arrowSide'], string> = {
    left: `${base} border-r-[var(--tooltip-bg)] border-r-8 border-y-8 top-1/2 -left-2 -translate-y-1/2`,
    right: `${base} border-l-[var(--tooltip-bg)] border-l-8 border-y-8 top-1/2 -right-2 -translate-y-1/2`,
    top: `${base} border-b-[var(--tooltip-bg)] border-b-8 border-x-8 -top-2 left-1/2 -translate-x-1/2`,
    bottom: `${base} border-t-[var(--tooltip-bg)] border-t-8 border-x-8 -bottom-2 left-1/2 -translate-x-1/2`,
  }
  return <span className={styles[side]} style={{ '--tooltip-bg': '#1c1c1c' } as React.CSSProperties} />
}

// ─── Welcome modal ────────────────────────────────────────────────────────────

function WelcomeModal({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-welcome-title"
    >
      <div className="bg-[#141414] border border-white/10 rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center">
        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
          <span className="text-2xl">⚡</span>
        </div>
        <h2 id="tour-welcome-title" className="text-lg font-semibold text-white mb-2">
          Welcome to FluxDesk
        </h2>
        <p className="text-sm text-white/60 leading-relaxed mb-8">
          Your personal AI workspace. Run tools, save prompts, and let FluxDesk learn how you work.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onStart}
            className="w-full py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors"
          >
            Take the tour
          </button>
          <button
            onClick={onSkip}
            className="w-full py-2.5 rounded-lg text-white/40 text-sm hover:text-white/60 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Complete modal ───────────────────────────────────────────────────────────

function CompleteModal({ onFinish }: { onFinish: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-complete-title"
    >
      <div className="bg-[#141414] border border-white/10 rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center">
        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5 text-2xl">
          ✓
        </div>
        <h2 id="tour-complete-title" className="text-lg font-semibold text-white mb-2">
          {"You're set up"}
        </h2>
        <p className="text-sm text-white/60 mb-8">Go run your first tool.</p>
        <button
          onClick={onFinish}
          className="w-full py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors"
        >
          Go to tools →
        </button>
      </div>
    </motion.div>
  )
}

// ─── Coach mark tooltip ───────────────────────────────────────────────────────

interface CoachMarkProps {
  step: TourStep
  config: StepConfig
  stepIndex: number
  totalSteps: number
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
}

function CoachMark({ step, config, stepIndex, totalSteps, onNext, onPrev, onSkip }: CoachMarkProps) {
  const [pos, setPos] = useState<TooltipPosition | null>(null)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  const updatePosition = useCallback(() => {
    if (!config.target) return
    const rect = getTargetRect(config.target)
    setTargetRect(rect)
    if (rect) {
      setPos(computePosition(rect, config.placement, window.innerWidth < 640))
    }
  }, [config.target, config.placement])

  useEffect(() => {
    updatePosition()
    window.addEventListener('resize', updatePosition)
    return () => window.removeEventListener('resize', updatePosition)
  }, [updatePosition])

  if (!pos || !targetRect) return null

  const isFirst = stepIndex === 1
  const isLast = stepIndex === totalSteps

  return (
    <>
      {/* Highlight ring around target */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed pointer-events-none z-[9998] rounded-lg"
        style={{
          top: targetRect.top - 4,
          left: targetRect.left - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
          boxShadow: '0 0 0 2px rgba(255,255,255,0.6), 0 0 0 4px rgba(255,255,255,0.15)',
          animation: 'tour-pulse 2s ease-in-out infinite',
        }}
      />

      {/* Tooltip */}
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.18 }}
        className="fixed z-[9999] bg-[#1c1c1c] border border-white/10 rounded-xl shadow-2xl p-4"
        style={{ width: TOOLTIP_WIDTH, top: pos.top, left: pos.left }}
        role="dialog"
        aria-modal="false"
        aria-label={`Tour step: ${config.title}`}
      >
        <TooltipArrow side={pos.arrowSide} />
        <p className="text-xs text-white/40 mb-1">{stepIndex} of {totalSteps}</p>
        <h3 className="text-sm font-semibold text-white mb-1">{config.title}</h3>
        <p className="text-xs text-white/60 leading-relaxed mb-3">{config.body}</p>

        <div className="flex items-center justify-between">
          <button
            onClick={onSkip}
            className="text-xs text-white/30 hover:text-white/50 transition-colors"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={onPrev}
                className="px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={onNext}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-black hover:bg-white/90 transition-colors"
            >
              {isLast ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>

        <ProgressDots current={step} />
      </motion.div>
    </>
  )
}

// ─── Main OnboardingTour ──────────────────────────────────────────────────────

export function OnboardingTour() {
  const { isActive, currentStep, nextStep, prevStep, skipTour, completeTour } = useTourStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Keyboard shortcuts
  useEffect(() => {
    if (!isActive) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleSkip()
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext()
      if (e.key === 'ArrowLeft') handlePrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, currentStep])

  async function markComplete() {
    try {
      await apiPost('/onboarding/complete')
    } catch (err: unknown) {
      console.error('[tour] failed to mark onboarding complete', err)
    }
  }

  function handleSkip() {
    markComplete().catch(() => { })
    skipTour()
  }

  function handleNext() {
    nextStep()
  }

  function handlePrev() {
    prevStep()
  }

  function handleFinish() {
    markComplete().catch(() => { })
    completeTour()
    // Navigate to tools
    window.location.href = '/tools'
  }

  if (!mounted || !isActive) return null

  const config = STEP_CONFIGS[currentStep]
  const isCoachMark = COACH_MARK_STEPS.includes(currentStep)
  const coachIdx = COACH_MARK_STEPS.indexOf(currentStep) + 1 // 1-based within coach marks

  return createPortal(
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9990] bg-black/50"
            style={{ backdropFilter: currentStep === 'welcome' || currentStep === 'complete' ? 'blur(4px)' : 'none' }}
            onClick={currentStep === 'welcome' || currentStep === 'complete' ? undefined : handleSkip}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {currentStep === 'welcome' && (
          <WelcomeModal key="welcome" onStart={nextStep} onSkip={handleSkip} />
        )}

        {isCoachMark && (
          <CoachMark
            key={currentStep}
            step={currentStep}
            config={config}
            stepIndex={coachIdx}
            totalSteps={COACH_MARK_STEPS.length}
            onNext={handleNext}
            onPrev={handlePrev}
            onSkip={handleSkip}
          />
        )}

        {currentStep === 'complete' && (
          <CompleteModal key="complete" onFinish={handleFinish} />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes tour-pulse {
          0%, 100% { box-shadow: 0 0 0 2px rgba(255,255,255,0.6), 0 0 0 4px rgba(255,255,255,0.15); }
          50%       { box-shadow: 0 0 0 2px rgba(255,255,255,0.9), 0 0 0 8px rgba(255,255,255,0.05); }
        }
      `}</style>
    </>,
    document.body
  )
}
