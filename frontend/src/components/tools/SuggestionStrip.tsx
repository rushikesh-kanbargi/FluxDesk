'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, BookmarkCheck, Bookmark, Loader2 } from 'lucide-react'
import { TOOL_CHAINS, extractSaveTitle } from '@/lib/toolChains'
import { cn } from '@/components/ui'

interface SuggestionStripProps {
  toolId: string
  toolName: string
  output: string
  isRunning: boolean
  onSave: (title: string) => Promise<void>
}

export function SuggestionStrip({ toolId, toolName, output, isRunning, onSave }: SuggestionStripProps) {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Appear ~200ms after the typewriter cursor disappears — not simultaneously.
  // The micro-delay lets the user's eye land on the finished output before
  // next-action chips materialize.
  useEffect(() => {
    if (!isRunning && output) {
      const t = setTimeout(() => setVisible(true), 200)
      return () => clearTimeout(t)
    } else {
      setVisible(false)
      setIsSaved(false)
    }
  }, [isRunning, output])

  const suggestions = TOOL_CHAINS[toolId] ?? []
  const showSaveChip = !isSaved

  if (suggestions.length === 0 && !showSaveChip) return null

  const handleQuickSave = async () => {
    if (isSaving || isSaved) return
    setIsSaving(true)
    try {
      await onSave(extractSaveTitle(output, toolName))
      setIsSaved(true)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="flex-shrink-0 px-5 py-2.5 flex items-center gap-2 flex-wrap border-t border-[rgba(255,255,255,0.04)]"
        >
          {/* Tool suggestion chips */}
          {suggestions.map((s) => (
            <button
              key={s.toolId}
              onClick={() => router.push(`/tools/${s.toolId}`)}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs',
                'border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)]',
                'text-[rgba(255,255,255,0.55)] hover:text-white hover:border-[rgba(245,166,35,0.35)]',
                'hover:bg-[rgba(245,166,35,0.06)] transition-colors duration-150',
              )}
            >
              {s.label}
              <ArrowRight size={10} className="opacity-50" />
            </button>
          ))}

          {/* Quick-save chip — differentiated from the full save modal in the header */}
          {showSaveChip && (
            <button
              onClick={handleQuickSave}
              disabled={isSaving}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs',
                'border transition-colors duration-150',
                isSaved
                  ? 'border-[rgba(52,211,153,0.3)] bg-[rgba(52,211,153,0.06)] text-emerald-400 cursor-default'
                  : 'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.55)] hover:text-white hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.06)]',
              )}
            >
              {isSaving ? (
                <Loader2 size={10} className="animate-spin" />
              ) : isSaved ? (
                <BookmarkCheck size={10} />
              ) : (
                <Bookmark size={10} />
              )}
              {isSaved ? 'Saved' : 'Save to Library'}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
