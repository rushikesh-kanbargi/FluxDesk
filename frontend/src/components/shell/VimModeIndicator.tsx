'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  active: boolean
}

export function VimModeIndicator({ active }: Props) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.1 }}
          className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#1c1c1c] border border-[rgba(255,255,255,0.15)] shadow-lg"
        >
          <span className="text-[rgba(255,255,255,0.3)] text-xs font-mono">g</span>
          <span className="text-[rgba(255,255,255,0.5)] text-xs">→ t p l a</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
