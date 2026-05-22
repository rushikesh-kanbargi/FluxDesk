'use client'

import { useEffect, useCallback, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, LayoutDashboard, Library, History, Settings,
  Zap, Sparkles, GitPullRequest, Bug, GitCommit, FileText,
  ClipboardList, Users, Layers, BookOpen, CreditCard, BarChart2,
  Video, MessageSquare, AlertTriangle, EyeOff, TrendingUp,
  ArrowRightLeft, Mail, Brain, MessageCircle,
  Plus, Workflow, Download, Keyboard, Clock,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/components/ui'
import { useUIStore } from '@/store/uiStore'
import { TOOL_CONFIGS } from '@/components/tools/configs'

// ── Command registry ───────────────────────────────────────────
interface CommandItem {
  id: string
  label: string
  group: string
  href: string | null
  icon: LucideIcon
  keywords?: string[]
  onAction?: () => void
}

const NAV_AND_TOOL_COMMANDS: CommandItem[] = [
  // Navigation
  { id: 'dashboard', label: 'Dashboard',      group: 'Navigation', href: '/dashboard', icon: LayoutDashboard },
  { id: 'library',   label: 'Prompt Library', group: 'Navigation', href: '/library',   icon: Library },
  { id: 'history',   label: 'History',        group: 'Navigation', href: '/history',   icon: History },
  { id: 'settings',  label: 'Settings',       group: 'Navigation', href: '/settings',  icon: Settings },

  // Prompting
  { id: 'forge',    label: 'Prompt Forge',   group: 'Prompting', href: '/tools/forge',    icon: Zap,      keywords: ['prompt', 'create', 'engineer', 'RISEN', 'CO-STAR'] },
  { id: 'improver', label: 'Prompt Refiner', group: 'Prompting', href: '/tools/improver', icon: Sparkles, keywords: ['improve', 'rewrite', 'better prompt', 'refine'] },

  // Development
  { id: 'code-review', label: 'Code Reviewer',     group: 'Development', href: '/tools/code-review', icon: GitPullRequest, keywords: ['review', 'code', 'PR'] },
  { id: 'bug-task',    label: 'Bug Ticket Writer',  group: 'Development', href: '/tools/bug-task',    icon: Bug,           keywords: ['bug', 'ticket', 'issue'] },
  { id: 'commit',      label: 'Commit Writer',      group: 'Development', href: '/tools/commit',      icon: GitCommit,     keywords: ['git', 'commit', 'conventional'] },
  { id: 'adr',         label: 'ADR Writer',         group: 'Development', href: '/tools/adr',         icon: FileText,      keywords: ['architecture', 'decision', 'record'] },

  // Planning
  { id: 'feature-spec', label: 'Feature Spec',      group: 'Planning', href: '/tools/feature-spec', icon: ClipboardList, keywords: ['spec', 'feature', 'user story'] },
  { id: 'standup',      label: 'Standup Writer',     group: 'Planning', href: '/tools/standup',      icon: Users,         keywords: ['standup', 'daily', 'Slack'] },
  { id: 'tech-stack',   label: 'Tech Stack Advisor', group: 'Planning', href: '/tools/tech-stack',   icon: Layers,        keywords: ['stack', 'technology', 'recommend'] },

  // Learning
  { id: 'concept-explainer', label: 'Concept Explainer', group: 'Learning', href: '/tools/concept-explainer', icon: BookOpen,   keywords: ['explain', 'learn', 'understand'] },
  { id: 'flashcards',        label: 'Flashcard Builder',  group: 'Learning', href: '/tools/flashcards',        icon: CreditCard, keywords: ['flashcard', 'study', 'spaced repetition'] },
  { id: 'compare',           label: 'Model Comparison',   group: 'Learning', href: '/tools/compare',           icon: BarChart2,  keywords: ['compare', 'GPT', 'Claude', 'Gemini'] },

  // Workplace
  { id: 'meeting-mirror',         label: 'Meeting Mirror',         group: 'Workplace', href: '/tools/meeting-mirror',         icon: Video,         keywords: ['meeting', 'transcript', 'analysis'] },
  { id: 'stakeholder-translator', label: 'Stakeholder Translator', group: 'Workplace', href: '/tools/stakeholder-translator', icon: MessageSquare, keywords: ['stakeholder', 'CEO', 'engineer', 'translate'] },
  { id: 'decision-autopsy',       label: 'Decision Autopsy',       group: 'Workplace', href: '/tools/decision-autopsy',       icon: AlertTriangle, keywords: ['decision', 'pre-mortem', 'risk'] },
  { id: 'silence-detector',       label: 'Silence Detector',       group: 'Workplace', href: '/tools/silence-detector',       icon: EyeOff },
  { id: 'complexity-budget',      label: 'Complexity Budget',      group: 'Workplace', href: '/tools/complexity-budget',      icon: TrendingUp },
  { id: 'context-handoff',        label: 'Handoff Brief',          group: 'Workplace', href: '/tools/context-handoff',        icon: ArrowRightLeft },
  { id: 'email-intent-decoder',   label: 'Email Decoder',          group: 'Workplace', href: '/tools/email-intent-decoder',   icon: Mail },
  { id: 'work-brain-dump',        label: 'Work Triage',            group: 'Workplace', href: '/tools/work-brain-dump',        icon: Brain },
  { id: 'feedback-translator',    label: 'Feedback Decoder',       group: 'Workplace', href: '/tools/feedback-translator',    icon: MessageCircle },
]

// Group render order
const GROUP_ORDER = ['Recent', 'Navigation', 'Prompting', 'Development', 'Planning', 'Learning', 'Workplace', 'Actions'] as const

// ── Preview data helper ────────────────────────────────────────
function getPreviewData(item: CommandItem | null) {
  if (!item) return null
  if (item.group === 'Navigation' || item.group === 'Actions' || item.group === 'Recent') {
    const toolConfig = TOOL_CONFIGS[item.id]
    if (!toolConfig) return null
    return {
      name: item.label,
      description: toolConfig.description,
      category: toolConfig.category,
    }
  }
  const toolConfig = TOOL_CONFIGS[item.id]
  return {
    name: item.label,
    description: toolConfig?.description ?? '',
    category: toolConfig?.category ?? item.group,
  }
}

// ── CommandPalette ─────────────────────────────────────────────
export function CommandPalette() {
  const open             = useUIStore((s) => s.commandPaletteOpen)
  const setOpen          = useUIStore((s) => s.setCommandPaletteOpen)
  const recentTools      = useUIStore((s) => s.recentTools)
  const setShortcutsOpen = useUIStore((s) => s.setShortcutsOpen)
  const router           = useRouter()
  const [search, setSearch]           = useState('')
  const [highlighted, setHighlighted] = useState<CommandItem | null>(null)

  // Build action commands — needs closure over setOpen, setShortcutsOpen
  const ACTION_COMMANDS: CommandItem[] = useMemo(() => [
    {
      id: 'action-new-prompt',
      label: 'New Prompt',
      group: 'Actions',
      href: null,
      icon: Plus,
      keywords: ['create', 'new', 'prompt', 'save'],
      onAction: () => {
        setOpen(false)
        window.dispatchEvent(new CustomEvent('fd:new-prompt'))
      },
    },
    {
      id: 'action-new-pipeline',
      label: 'New Pipeline',
      group: 'Actions',
      href: '/pipelines?create=true',
      icon: Workflow,
      keywords: ['pipeline', 'chain', 'automate'],
    },
    {
      id: 'action-settings',
      label: 'Open Settings',
      group: 'Actions',
      href: '/settings',
      icon: Settings,
      keywords: ['preferences', 'config', 'settings'],
    },
    {
      id: 'action-export-prompts',
      label: 'Export Prompts',
      group: 'Actions',
      href: null,
      icon: Download,
      keywords: ['export', 'backup', 'download'],
      onAction: () => {
        setOpen(false)
        window.dispatchEvent(new CustomEvent('fd:export-prompts'))
      },
    },
    {
      id: 'action-keyboard-help',
      label: 'Keyboard Shortcuts',
      group: 'Actions',
      href: null,
      icon: Keyboard,
      keywords: ['shortcuts', 'hotkeys', 'keyboard'],
      onAction: () => {
        setOpen(false)
        setShortcutsOpen(true)
      },
    },
  ], [setOpen, setShortcutsOpen])

  const ALL_COMMANDS = useMemo(
    () => [...NAV_AND_TOOL_COMMANDS, ...ACTION_COMMANDS],
    [ACTION_COMMANDS],
  )

  // Recent items from store, mapped to CommandItem with group 'Recent'
  const recentItems = useMemo<CommandItem[]>(() => {
    return recentTools
      .slice(0, 4)
      .map((toolId) => {
        const base = NAV_AND_TOOL_COMMANDS.find((c) => c.id === toolId)
        if (!base) return null
        return { ...base, group: 'Recent' }
      })
      .filter((x): x is CommandItem => x !== null)
  }, [recentTools])

  // Reset on close — clearing ephemeral search state when modal closes is intentional.
  useEffect(() => {
    if (!open) {
      setSearch('')
      setHighlighted(null)
    }
  }, [open])

  // Escape closes
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, setOpen])

  const handleSelect = useCallback(
    (item: CommandItem) => {
      if (item.onAction) {
        item.onAction()
        return
      }
      if (item.href) {
        setOpen(false)
        router.push(item.href)
      }
    },
    [setOpen, router],
  )

  // Grouped items for rendering
  const groups = useMemo(() => {
    const result: { label: string; items: CommandItem[] }[] = []

    // Recent only when no search query
    if (!search && recentItems.length > 0) {
      result.push({ label: 'Recent', items: recentItems })
    }

    for (const group of GROUP_ORDER) {
      if (group === 'Recent') continue
      const items = ALL_COMMANDS.filter((c) => c.group === group)
      if (items.length > 0) result.push({ label: group, items })
    }

    return result
  }, [search, recentItems, ALL_COMMANDS])

  const preview = getPreviewData(highlighted)

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
            className="fixed inset-0 z-40 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, scale: 0.97, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              'fixed left-1/2 top-[15%] z-50 -translate-x-1/2',
              'w-full max-w-[560px] md:max-w-[820px]',
              'bg-[#1f1f23] border border-[rgba(255,255,255,0.10)] rounded-2xl',
              'shadow-[0_24px_64px_rgba(0,0,0,0.7)]',
              'overflow-hidden',
            )}
          >
            {/* Inner flex: list + preview */}
            <div className="flex">
              {/* Left: search + list */}
              <div className="flex-1 min-w-0 flex flex-col">
                <Command label="Global command palette" shouldFilter>
                  {/* Search input */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
                    <Search size={15} className="text-[rgba(255,255,255,0.4)] flex-shrink-0" />
                    <Command.Input
                      value={search}
                      onValueChange={setSearch}
                      placeholder="Search tools, pages, actions..."
                      className={cn(
                        'flex-1 bg-transparent text-sm text-white placeholder:text-[rgba(255,255,255,0.35)]',
                        'border-none outline-none',
                      )}
                      style={{ fontFamily: 'var(--font-sora)' }}
                      autoFocus
                    />
                    <kbd className="px-1.5 py-0.5 text-[10px] text-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.06)] rounded border border-[rgba(255,255,255,0.08)]">
                      ESC
                    </kbd>
                  </div>

                  {/* Results */}
                  <Command.List className="max-h-[380px] overflow-y-auto py-2 scrollbar-none">
                    <Command.Empty className="py-8 text-center text-sm text-[rgba(255,255,255,0.35)]">
                      No results for &ldquo;{search}&rdquo;
                    </Command.Empty>

                    {groups.map((group) => (
                      <Command.Group
                        key={group.label}
                        heading={group.label}
                        className={cn(
                          '[&_[cmdk-group-heading]]:px-4',
                          '[&_[cmdk-group-heading]]:py-1.5',
                          '[&_[cmdk-group-heading]]:text-xs',
                          '[&_[cmdk-group-heading]]:font-semibold',
                          '[&_[cmdk-group-heading]]:uppercase',
                          '[&_[cmdk-group-heading]]:tracking-widest',
                          '[&_[cmdk-group-heading]]:text-[rgba(255,255,255,0.25)]',
                        )}
                      >
                        {group.items.map((item) => {
                          const Icon = item.icon
                          return (
                            <Command.Item
                              key={group.label === 'Recent' ? `recent-${item.id}` : item.id}
                              value={`${item.label} ${item.keywords?.join(' ') ?? ''}`}
                              onSelect={() => handleSelect(item)}
                              onMouseEnter={() => setHighlighted(item)}
                              className={cn(
                                'flex items-center gap-3 px-4 py-2.5 mx-1 rounded-lg',
                                'text-sm text-[rgba(255,255,255,0.8)] cursor-pointer',
                                'transition-colors duration-100 outline-none',
                                'aria-selected:bg-[rgba(245,166,35,0.08)] aria-selected:text-white',
                                'data-[selected]:bg-[rgba(245,166,35,0.08)] data-[selected]:text-white',
                              )}
                            >
                              <div className="flex-shrink-0 w-7 h-7 rounded-md bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center">
                                {group.label === 'Recent'
                                  ? <Clock size={13} className="text-[rgba(245,166,35,0.6)]" />
                                  : <Icon size={13} className="text-[rgba(255,255,255,0.45)]" />
                                }
                              </div>
                              <span className="flex-1">{item.label}</span>
                              {item.group !== 'Navigation' && item.group !== 'Recent' && item.group !== 'Actions' && (
                                <span className="text-[10px] text-[rgba(255,255,255,0.25)]">
                                  {item.group}
                                </span>
                              )}
                              {item.group === 'Recent' && (
                                <span className="text-[10px] text-[rgba(245,166,35,0.5)]">recent</span>
                              )}
                            </Command.Item>
                          )
                        })}
                      </Command.Group>
                    ))}
                  </Command.List>

                  {/* Footer hints */}
                  <div className="flex items-center gap-4 px-4 py-2.5 border-t border-[rgba(255,255,255,0.06)]">
                    <Hint keys={['↑', '↓']} label="navigate" />
                    <Hint keys={['↵']}       label="open" />
                    <Hint keys={['ESC']}     label="close" />
                  </div>
                </Command>
              </div>

              {/* Right: preview panel — only on md+ */}
              <AnimatePresence>
                {preview && (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 256 }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.18 }}
                    className="hidden md:flex flex-col border-l border-[rgba(255,255,255,0.08)] overflow-hidden flex-shrink-0"
                    style={{ width: 256 }}
                  >
                    <div className="p-5 flex flex-col gap-3 h-full">
                      {/* Category badge */}
                      <span className="inline-flex self-start items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-[rgba(245,166,35,0.10)] text-[rgba(245,166,35,0.8)] border border-[rgba(245,166,35,0.2)]">
                        {preview.category}
                      </span>

                      {/* Tool name */}
                      <p className="text-white font-semibold text-base leading-snug">
                        {preview.name}
                      </p>

                      {/* Description */}
                      {preview.description && (
                        <p className="text-[rgba(255,255,255,0.45)] text-xs leading-relaxed">
                          {preview.description}
                        </p>
                      )}

                      <div className="mt-auto pt-3 border-t border-[rgba(255,255,255,0.06)]">
                        <p className="text-[10px] text-[rgba(255,255,255,0.2)]">
                          Press ↵ to open
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Footer hint pill ───────────────────────────────────────────
function Hint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center gap-1 text-[10px] text-[rgba(255,255,255,0.3)]">
      {keys.map((k) => (
        <kbd
          key={k}
          className="px-1 py-0.5 bg-[rgba(255,255,255,0.06)] rounded text-[9px] border border-[rgba(255,255,255,0.08)]"
        >
          {k}
        </kbd>
      ))}
      {label}
    </div>
  )
}
