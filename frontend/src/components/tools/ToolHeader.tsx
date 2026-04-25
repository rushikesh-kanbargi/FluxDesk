'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { History, ChevronDown, type LucideIcon } from 'lucide-react'
import {
  Zap, Sparkles, GitPullRequest, Bug, GitCommit, FileText,
  ClipboardList, Users, Layers, BookOpen, CreditCard, BarChart2,
  Video, MessageSquare, AlertTriangle, EyeOff, TrendingUp,
  ArrowRightLeft, Mail, Brain, MessageCircle,
} from 'lucide-react'
import {
  Button,
  Badge,
  Tooltip,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  cn,
} from '@/components/ui/index'
import { useUIStore } from '@/store/uiStore'
import { AI_PROVIDERS, type AIProvider } from '@/types'
import type { ToolConfig } from './configs'

const ICON_MAP: Record<string, LucideIcon> = {
  Zap, Sparkles, GitPullRequest, Bug, GitCommit, FileText,
  ClipboardList, Users, Layers, BookOpen, CreditCard, BarChart2,
  Video, MessageSquare, AlertTriangle, EyeOff, TrendingUp,
  ArrowRightLeft, Mail, Brain, MessageCircle,
}

interface ToolHeaderProps {
  config: ToolConfig
  categoryStyle: { color: string; bgColor: string; borderColor: string }
  onHistoryClick: () => void
  isRunning: boolean
}

export function ToolHeader({ config, categoryStyle, onHistoryClick, isRunning }: ToolHeaderProps) {
  const activeProvider = useUIStore((s) => s.activeProvider)
  const setActiveProvider = useUIStore((s) => s.setActiveProvider)
  const Icon = ICON_MAP[config.icon] ?? Zap
  const providerInfo = AI_PROVIDERS[activeProvider as AIProvider]

  return (
    <div className="flex-shrink-0 border-b border-[rgba(255,255,255,0.06)] bg-[#09090b]">
      {/* Running progress bar */}
      <AnimateProgressBar active={isRunning} />

      <div className="flex items-center justify-between px-5 py-3">
        {/* Left: Tool info */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: categoryStyle.bgColor, border: `1px solid ${categoryStyle.borderColor}` }}
          >
            <Icon size={15} style={{ color: categoryStyle.color }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-ink truncate">{config.name}</h1>
              {config.flagship && (
                <Badge variant="amber" className="text-[10px] py-0">Flagship</Badge>
              )}
            </div>
            <p className="text-xs text-ink-dim truncate hidden sm:block">{config.description}</p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* AI Provider pill */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
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
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: providerInfo.color }}
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
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: info.color }}
                  />
                  {info.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* History */}
          <Tooltip content="View history">
            <Button variant="ghost" size="icon" onClick={onHistoryClick} className="h-7 w-7">
              <History size={14} />
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}

function AnimateProgressBar({ active }: { active: boolean }) {
  return (
    <div className="h-0.5 w-full overflow-hidden">
      <AnimatePresence>
        {active && (
          <motion.div
            key="progress"
            className="h-full w-full progress-bar"
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
