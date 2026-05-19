'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, Save, ThumbsUp, ThumbsDown, Clock, Cpu, FileDown, X } from 'lucide-react'
import { Button, Skeleton, cn, Input } from '@/components/ui/index'
import { useForm } from 'react-hook-form'
import { getErrorMessage } from '@/lib/errors'
import toast from 'react-hot-toast'

function formatLatency(ms: number): string {
  if (ms < 1000) return '< 1s'
  return `${(ms / 1000).toFixed(1)}s`
}

function estimateTokens(text: string): number {
  return Math.round(text.length / 4)
}

interface OutputPanelProps {
  output: string
  isRunning: boolean
  provider: string
  durationMs: number
  outputLabel: string
  usageId: string | null
  rated: number | null
  onRate: (rating: number) => void
  onSave: (title: string) => Promise<void>
  isSaving: boolean
  toolId?: string
}

export function OutputPanel({
  output,
  isRunning,
  provider,
  durationMs,
  outputLabel,
  usageId,
  rated,
  onRate,
  onSave,
  isSaving,
  toolId,
}: OutputPanelProps) {
  const [copied, setCopied] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ title: string }>()

  const handleCopy = useCallback(async () => {
    if (!output) return
    let textToCopy = output
    if (toolId === 'forge') {
      try {
        const parsed = JSON.parse(output.replace(/```json|```/g, '').trim())
        if (parsed.prompt) textToCopy = parsed.prompt
      } catch {
        // fallback to raw output
      }
    }
    await navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied to clipboard')
  }, [output, toolId])

  const handleSaveSubmit = handleSubmit(async ({ title }) => {
    try {
      await onSave(title)
      setSaveOpen(false)
      reset()
    } catch (e) {
      const m = getErrorMessage(e, 'Could not save this output to the library.')
      if (m) toast.error(m)
    }
  })

  // Cmd+S → open save form
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && output && !isRunning) {
        e.preventDefault()
        setSaveOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [output, isRunning])

  // Reset form when save closes
  useEffect(() => {
    if (!saveOpen) reset()
  }, [saveOpen, reset])

  const handleExport = useCallback(() => {
    const blob = new Blob([output], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fluxdesk-${outputLabel.toLowerCase().replace(/\s+/g, '-')}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [output, outputLabel])

  const isEmpty = !output && !isRunning

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between">
        <span className="text-xs font-medium text-ink-dim uppercase tracking-wider">{outputLabel}</span>

        {output && !isRunning && (
          <div className="flex items-center gap-1.5">
            {/* Copy */}
            <Button variant="ghost" size="icon" onClick={handleCopy} aria-label={copied ? 'Copied' : 'Copy to clipboard'} className="h-7 w-7">
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <Check size={13} className="text-emerald" />
                  </motion.div>
                ) : (
                  <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <Copy size={13} />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>

            {/* Save to Library */}
            <Button variant="ghost" size="icon" onClick={() => setSaveOpen(true)} aria-label="Save to library" className="h-7 w-7">
              <Save size={13} />
            </Button>

            {/* Export */}
            <Button variant="ghost" size="icon" onClick={handleExport} aria-label="Export as markdown" className="h-7 w-7">
              <FileDown size={13} />
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-5 py-4">
        {isRunning ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[85%]" />
            <Skeleton className="h-4 w-[70%]" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-[60%]" />
            <Skeleton className="h-4 w-[80%]" />
          </div>
        ) : isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-12 h-12 rounded-xl bg-[rgba(245,166,35,0.06)] border border-[rgba(245,166,35,0.15)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M10 2L12.5 7.5H18L13.5 11L15.5 17L10 13.5L4.5 17L6.5 11L2 7.5H7.5L10 2Z"
                  fill="rgba(245,166,35,0.4)"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-ink">Ready to generate</p>
              <p className="text-xs text-ink-dim mt-1">Fill in the inputs and click Generate</p>
            </div>
          </div>
        ) : (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="output-prose"
            >
              <pre className="whitespace-pre-wrap text-sm text-ink leading-relaxed font-sans">
                {output}
              </pre>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Inline Save to Library form */}
      <AnimatePresence>
        {saveOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden border-t border-[rgba(245,166,35,0.2)] bg-[rgba(245,166,35,0.04)]"
          >
            <form onSubmit={handleSaveSubmit} className="px-5 py-3 flex items-center gap-2">
              <Save size={13} className="text-amber flex-shrink-0" />
              <input
                className="flex-1 bg-transparent text-sm text-ink placeholder-ink-dim outline-none min-w-0"
                placeholder="Title for this prompt..."
                autoFocus
                {...register('title', { required: 'Title is required' })}
              />
              {errors.title && (
                <span className="text-xs text-rose flex-shrink-0">{errors.title.message}</span>
              )}
              <Button variant="primary" size="sm" type="submit" loading={isSaving} className="flex-shrink-0">
                Save
              </Button>
              <button
                type="button"
                onClick={() => setSaveOpen(false)}
                aria-label="Cancel save"
                className="p-1 text-ink-dim hover:text-ink transition-colors flex-shrink-0"
              >
                <X size={13} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer: metadata + rating */}
      {output && !isRunning && (
        <div className="flex-shrink-0 border-t border-[rgba(255,255,255,0.06)] px-5 py-3">
          <div className="flex items-center justify-between">
            {/* Metadata: tokens · provider · latency */}
            <div className="flex items-center gap-3">
              {output && (
                <span className="text-xs text-ink-dim">
                  {estimateTokens(output).toLocaleString()} tokens
                </span>
              )}
              {provider && (
                <div className="flex items-center gap-1.5 text-xs text-ink-dim">
                  <Cpu size={11} />
                  <span className="capitalize">{provider}</span>
                </div>
              )}
              {durationMs > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-ink-dim">
                  <Clock size={11} />
                  <span>{formatLatency(durationMs)}</span>
                </div>
              )}
            </div>

            {/* Rating */}
            {usageId && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-dim">Helpful?</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onRate(5)}
                    aria-label="Rate as helpful"
                    className={cn(
                      'p-1.5 rounded-md transition-colors duration-150',
                      rated === 5
                        ? 'bg-[rgba(52,211,153,0.10)] text-emerald'
                        : 'text-ink-dim hover:text-emerald hover:bg-[rgba(52,211,153,0.08)]',
                    )}
                  >
                    <ThumbsUp size={12} />
                  </button>
                  <button
                    onClick={() => onRate(1)}
                    aria-label="Rate as not helpful"
                    className={cn(
                      'p-1.5 rounded-md transition-colors duration-150',
                      rated === 1
                        ? 'bg-[rgba(244,63,94,0.10)] text-rose'
                        : 'text-ink-dim hover:text-rose hover:bg-[rgba(244,63,94,0.08)]',
                    )}
                  >
                    <ThumbsDown size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
