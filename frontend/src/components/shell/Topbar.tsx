'use client'

import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronDown } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, cn,
} from '@/components/ui'
import { useUIStore } from '@/store/uiStore'
import { AI_PROVIDERS, type AIProvider } from '@/types'

export function Topbar() {
  const pathname = usePathname()
  const activeProvider = useUIStore((s) => s.activeProvider)
  const setActiveProvider = useUIStore((s) => s.setActiveProvider)
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen)
  const providerInfo = AI_PROVIDERS[activeProvider as AIProvider]

  // Tool pages have their own header — skip global topbar there
  if (pathname.startsWith('/tools/')) return null

  return (
    <header className="flex-shrink-0 h-12 px-4 flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] bg-[#09090b]">
      {/* ⌘K search trigger */}
      <button
        onClick={() => setCommandPaletteOpen(true)}
        aria-label="Open command palette"
        className={cn(
          'flex items-center gap-2 h-7 px-3 rounded-lg text-xs',
          'border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]',
          'text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.7)] hover:border-[rgba(255,255,255,0.12)]',
          'transition-colors duration-150',
        )}
      >
        <Search size={12} />
        <span>Search or run a tool...</span>
        <kbd className="ml-1 px-1 py-0.5 bg-[rgba(255,255,255,0.06)] rounded text-[10px] border border-[rgba(255,255,255,0.06)]">
          ⌘K
        </kbd>
      </button>

      {/* AI provider pill */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label={`AI provider: ${providerInfo.label}. Click to change.`}
            className={cn(
              'flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium',
              'border transition-colors duration-150',
              'hover:bg-[rgba(255,255,255,0.04)]',
            )}
            style={{
              color: providerInfo.color,
              borderColor: `${providerInfo.color}40`,
              backgroundColor: `${providerInfo.color}10`,
            }}
          >
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: providerInfo.color }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            {providerInfo.label}
            <ChevronDown size={11} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {Object.entries(AI_PROVIDERS).map(([key, info]) => (
            <DropdownMenuItem
              key={key}
              onClick={() => setActiveProvider(key as AIProvider)}
              className={activeProvider === key ? 'text-amber' : ''}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: info.color }} />
              {info.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
