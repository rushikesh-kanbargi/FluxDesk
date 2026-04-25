'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, Save, ThumbsUp, ThumbsDown, Clock, Cpu, FileDown } from 'lucide-react'
import { Button, Skeleton, cn, Dialog, DialogContent, Input } from '@/components/ui/index'
import { useForm } from 'react-hook-form'
import { getErrorMessage } from '@/lib/errors'
import toast from 'react-hot-toast'

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
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied to clipboard')
  }, [output])

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
            <Button variant="ghost" size="icon" onClick={handleCopy} className="h-7 w-7">
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
            <Button variant="ghost" size="icon" onClick={() => setSaveOpen(true)} className="h-7 w-7">
              <Save size={13} />
            </Button>

            {/* Export */}
            <Button variant="ghost" size="icon" onClick={handleExport} className="h-7 w-7">
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

      {/* Footer: metadata + rating */}
      {output && !isRunning && (
        <div className="flex-shrink-0 border-t border-[rgba(255,255,255,0.06)] px-5 py-3">
          <div className="flex items-center justify-between">
            {/* Metadata */}
            <div className="flex items-center gap-3">
              {provider && (
                <div className="flex items-center gap-1.5 text-xs text-ink-dim">
                  <Cpu size={11} />
                  <span className="capitalize">{provider}</span>
                </div>
              )}
              {durationMs > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-ink-dim">
                  <Clock size={11} />
                  <span>{(durationMs / 1000).toFixed(1)}s</span>
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

      {/* Save to Library Dialog */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent title="Save to Library" description="Give this prompt a memorable title">
          <form onSubmit={handleSaveSubmit} className="space-y-4">
            <Input
              label="Title"
              placeholder="e.g. React TypeScript code review prompt"
              required
              {...register('title', { required: 'Title is required' })}
              error={errors.title?.message}
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" type="button" onClick={() => setSaveOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={isSaving}>
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
