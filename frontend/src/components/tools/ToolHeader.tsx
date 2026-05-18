'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { History, ChevronDown, Check, type LucideIcon } from 'lucide-react'
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
import { useProjects } from '@/hooks/useProjects'
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
  const activeProjectId = useUIStore((s) => s.activeProjectId)
  const setActiveProjectId = useUIStore((s) => s.setActiveProjectId)
  const { data: projects = [], isLoading: projectsLoading } = useProjects()
  const Icon = ICON_MAP[config.icon] ?? Zap
  const providerInfo = AI_PROVIDERS[activeProvider as AIProvider]
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null

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

          {/* Project picker */}
          <ProjectPicker
            projects={projects}
            activeProject={activeProject}
            onSelect={setActiveProjectId}
            isLoading={projectsLoading}
          />

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

interface ProjectPickerProps {
  projects: Array<{ id: string; name: string; color: string }>
  activeProject: { id: string; name: string; color: string } | null
  onSelect: (id: string | null) => void
  isLoading?: boolean
}

function ProjectPicker({ projects, activeProject, onSelect, isLoading = false }: ProjectPickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, handleClickOutside])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => !isLoading && setOpen((v) => !v)}
        disabled={isLoading}
        className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.14)] text-[rgba(255,255,255,0.6)] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? (
          <span className="w-20 h-2 rounded bg-[rgba(255,255,255,0.1)] animate-pulse block" />
        ) : activeProject ? (
          <>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: activeProject.color }} />
            <span className="max-w-[100px] truncate">{activeProject.name}</span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full flex-shrink-0 bg-[rgba(255,255,255,0.2)]" />
            <span className="text-[rgba(255,255,255,0.35)]">No project</span>
          </>
        )}
        <ChevronDown size={11} className="flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-xl shadow-xl z-50 py-1">
          {/* No project option */}
          <div
            role="button"
            tabIndex={0}
            className="flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-[rgba(255,255,255,0.06)] cursor-pointer text-[rgba(255,255,255,0.4)]"
            onClick={() => { onSelect(null); setOpen(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { onSelect(null); setOpen(false) } }}
          >
            <span className="w-2 h-2 rounded-full bg-[rgba(255,255,255,0.2)] flex-shrink-0" />
            <span className="flex-1">No project</span>
            {activeProject === null && <Check size={12} className="text-amber-400 flex-shrink-0" />}
          </div>

          {projects.length > 0 && (
            <div className="border-t border-[rgba(255,255,255,0.06)] mt-1 pt-1">
              {projects.map((project) => (
                <div
                  key={project.id}
                  role="button"
                  tabIndex={0}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-[rgba(255,255,255,0.06)] cursor-pointer text-white"
                  onClick={() => { onSelect(project.id); setOpen(false) }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { onSelect(project.id); setOpen(false) } }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                  <span className="flex-1 truncate">{project.name}</span>
                  {activeProject?.id === project.id && <Check size={12} className="text-amber-400 flex-shrink-0" />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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
