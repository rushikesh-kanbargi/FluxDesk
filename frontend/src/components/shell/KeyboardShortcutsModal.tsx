'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '@/store/uiStore'

// ── Shortcuts data ─────────────────────────────────────────────
const SHORTCUT_GROUPS = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['G', 'T'], description: 'Go to Tools' },
      { keys: ['G', 'P'], description: 'Go to Prompts' },
      { keys: ['G', 'L'], description: 'Go to Pipelines' },
      { keys: ['G', 'A'], description: 'Go to Activity' },
      { keys: ['⌘', ','], description: 'Settings' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Open command palette' },
      { keys: ['⌘', 'N'], description: 'New prompt' },
      { keys: ['⌘', '⇧', 'N'], description: 'New pipeline' },
      { keys: ['⌘', 'E'], description: 'Export prompts' },
      { keys: ['⌘', '/'], description: 'This help screen' },
      { keys: ['['], description: 'Toggle sidebar' },
      { keys: ['?'], description: 'Keyboard shortcuts' },
    ],
  },
  {
    title: 'In-Tool',
    shortcuts: [
      { keys: ['⌘', '↵'], description: 'Run tool' },
      { keys: ['Esc'], description: 'Close / cancel' },
    ],
  },
]

// ── KbdKey ─────────────────────────────────────────────────────
function KbdKey({ children }: { children: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded bg-[rgba(255,255,255,0.07)] border border-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.7)] text-xs font-mono leading-none">
      {children}
    </kbd>
  )
}

// ── KeyboardShortcutsModal ─────────────────────────────────────
export function KeyboardShortcutsModal() {
  const open    = useUIStore((s) => s.shortcutsOpen)
  const setOpen = useUIStore((s) => s.setShortcutsOpen)

  // Escape closes
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, setOpen])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9980] bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9981] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="bg-[#111113] border border-[rgba(255,255,255,0.10)] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.7)] p-6 w-full max-w-lg pointer-events-auto"
              role="dialog"
              aria-modal="true"
              aria-labelledby="shortcuts-title"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <h2
                  id="shortcuts-title"
                  className="text-white font-semibold text-sm"
                >
                  Keyboard Shortcuts
                </h2>
                <button
                  onClick={() => setOpen(false)}
                  className="text-[rgba(255,255,255,0.35)] hover:text-white transition-colors text-xs px-2 py-1 rounded border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] hover:bg-[rgba(255,255,255,0.04)]"
                  aria-label="Close shortcuts"
                >
                  Esc
                </button>
              </div>

              {/* Shortcut groups — two-column grid */}
              <div className="grid grid-cols-2 gap-6">
                {SHORTCUT_GROUPS.map((group) => (
                  <div key={group.title}>
                    <h3 className="text-[rgba(255,255,255,0.35)] text-[10px] uppercase tracking-widest mb-3 font-medium">
                      {group.title}
                    </h3>
                    <ul className="space-y-2.5">
                      {group.shortcuts.map((s) => (
                        <li
                          key={s.description}
                          className="flex items-center justify-between gap-3"
                        >
                          <span className="text-[rgba(255,255,255,0.55)] text-xs">
                            {s.description}
                          </span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {s.keys.map((k, i) => (
                              <KbdKey key={i}>{k}</KbdKey>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <p className="mt-5 pt-4 border-t border-[rgba(255,255,255,0.06)] text-[11px] text-[rgba(255,255,255,0.25)] text-center">
                Press <KbdKey>?</KbdKey> or <KbdKey>⌘/</KbdKey> anytime to see this
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
