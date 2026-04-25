'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useEffect } from 'react'

const SHORTCUTS = [
  { keys: ['⌘', 'K'],     description: 'Open command palette' },
  { keys: ['⌘', '↵'],     description: 'Run current tool' },
  { keys: ['⌘', 'S'],     description: 'Save output to library' },
  { keys: ['['],           description: 'Toggle sidebar' },
  { keys: ['?'],           description: 'Show this help' },
  { keys: ['Esc'],         description: 'Close modal / palette' },
]

export function KeyboardShortcutsModal() {
  const open = useUIStore((s) => s.shortcutsOpen)
  const setOpen = useUIStore((s) => s.setShortcutsOpen)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, setOpen])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-1/2 top-[30%] z-50 -translate-x-1/2 w-full max-w-sm bg-[#1f1f23] border border-[rgba(255,255,255,0.10)] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.7)] overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
              <h2 className="text-sm font-semibold text-ink">Keyboard shortcuts</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-md text-ink-dim hover:text-ink hover:bg-[rgba(255,255,255,0.06)] transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="px-5 py-3 space-y-2.5">
              {SHORTCUTS.map(({ keys, description }) => (
                <div key={description} className="flex items-center justify-between">
                  <span className="text-sm text-ink-muted">{description}</span>
                  <div className="flex items-center gap-1">
                    {keys.map((k, i) => (
                      <kbd
                        key={i}
                        className="px-1.5 py-0.5 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.10)] rounded text-[11px] text-ink-dim font-mono"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-[rgba(255,255,255,0.06)]">
              <p className="text-[11px] text-ink-dim text-center">
                Press <kbd className="px-1 py-0.5 bg-[rgba(255,255,255,0.06)] rounded text-[10px] border border-[rgba(255,255,255,0.08)]">?</kbd> anytime to see this
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
