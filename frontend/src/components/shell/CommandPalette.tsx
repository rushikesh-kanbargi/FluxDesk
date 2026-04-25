'use client'

import { useEffect, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, LayoutDashboard, Library, History, Settings,
  Zap, Sparkles, GitPullRequest, Bug, GitCommit, FileText,
  ClipboardList, Users, Layers, BookOpen, CreditCard, BarChart2,
  Video, MessageSquare, AlertTriangle, EyeOff, TrendingUp,
  ArrowRightLeft, Mail, Brain, MessageCircle,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/components/ui'
import { useUIStore } from '@/store/uiStore'

// ── Command registry ───────────────────────────────────────────
interface CommandItem {
  id: string
  label: string
  group: string
  href: string
  icon: LucideIcon
  keywords?: string[]
}

const COMMANDS: CommandItem[] = [
  // Navigation
  { id: 'dashboard', label: 'Dashboard',     group: 'Navigation', href: '/dashboard', icon: LayoutDashboard },
  { id: 'library',   label: 'Prompt Library', group: 'Navigation', href: '/library',   icon: Library },
  { id: 'history',   label: 'History',        group: 'Navigation', href: '/history',   icon: History },
  { id: 'settings',  label: 'Settings',       group: 'Navigation', href: '/settings',  icon: Settings },

  // Prompting
  { id: 'forge',    label: 'PromptForge',     group: 'Prompting', href: '/tools/forge',    icon: Zap,      keywords: ['prompt', 'create', 'engineer', 'RISEN', 'CO-STAR'] },
  { id: 'improver', label: 'Prompt Improver', group: 'Prompting', href: '/tools/improver', icon: Sparkles, keywords: ['improve', 'rewrite', 'better prompt'] },

  // Development
  { id: 'code-review', label: 'Code Review Brief', group: 'Development', href: '/tools/code-review', icon: GitPullRequest, keywords: ['review', 'code', 'PR'] },
  { id: 'bug-task',    label: 'Bug → Task',         group: 'Development', href: '/tools/bug-task',    icon: Bug,           keywords: ['bug', 'ticket', 'issue'] },
  { id: 'commit',      label: 'Commit Writer',       group: 'Development', href: '/tools/commit',      icon: GitCommit,     keywords: ['git', 'commit', 'conventional'] },
  { id: 'adr',         label: 'ADR Generator',       group: 'Development', href: '/tools/adr',         icon: FileText,      keywords: ['architecture', 'decision', 'record'] },

  // Planning
  { id: 'feature-spec', label: 'Feature Spec',       group: 'Planning', href: '/tools/feature-spec', icon: ClipboardList, keywords: ['spec', 'feature', 'user story'] },
  { id: 'standup',      label: 'Standup Writer',      group: 'Planning', href: '/tools/standup',      icon: Users,         keywords: ['standup', 'daily', 'Slack'] },
  { id: 'tech-stack',   label: 'Tech Stack Advisor',  group: 'Planning', href: '/tools/tech-stack',   icon: Layers,        keywords: ['stack', 'technology', 'recommend'] },

  // Learning
  { id: 'concept-explainer', label: 'Concept Explainer', group: 'Learning', href: '/tools/concept-explainer', icon: BookOpen,   keywords: ['explain', 'learn', 'understand'] },
  { id: 'flashcards',        label: 'Flashcard Factory',  group: 'Learning', href: '/tools/flashcards',        icon: CreditCard, keywords: ['flashcard', 'study', 'spaced repetition'] },
  { id: 'compare',           label: 'Model Comparator',   group: 'Learning', href: '/tools/compare',           icon: BarChart2,  keywords: ['compare', 'GPT', 'Claude', 'Gemini'] },

  // Workplace
  { id: 'meeting-mirror',         label: 'Meeting Mirror',         group: 'Workplace', href: '/tools/meeting-mirror',         icon: Video,           keywords: ['meeting', 'transcript', 'analysis'] },
  { id: 'stakeholder-translator', label: 'Stakeholder Translator', group: 'Workplace', href: '/tools/stakeholder-translator', icon: MessageSquare,   keywords: ['stakeholder', 'CEO', 'engineer', 'translate'] },
  { id: 'decision-autopsy',       label: 'Decision Autopsy',       group: 'Workplace', href: '/tools/decision-autopsy',       icon: AlertTriangle,   keywords: ['decision', 'pre-mortem', 'risk'] },
  { id: 'silence-detector',       label: 'Silence Detector',       group: 'Workplace', href: '/tools/silence-detector',       icon: EyeOff },
  { id: 'complexity-budget',      label: 'Complexity Budget',      group: 'Workplace', href: '/tools/complexity-budget',      icon: TrendingUp },
  { id: 'context-handoff',        label: 'Context Handoff',        group: 'Workplace', href: '/tools/context-handoff',        icon: ArrowRightLeft },
  { id: 'email-intent-decoder',   label: 'Email Intent Decoder',   group: 'Workplace', href: '/tools/email-intent-decoder',   icon: Mail },
  { id: 'work-brain-dump',        label: 'Work Brain Dump',        group: 'Workplace', href: '/tools/work-brain-dump',        icon: Brain },
  { id: 'feedback-translator',    label: 'Feedback Translator',    group: 'Workplace', href: '/tools/feedback-translator',    icon: MessageCircle },
]

const GROUP_ORDER = ['Navigation', 'Prompting', 'Development', 'Planning', 'Learning', 'Workplace'] as const

// ── CommandPalette ─────────────────────────────────────────────
export function CommandPalette() {
  const open    = useUIStore((s) => s.commandPaletteOpen)
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen)
  const router  = useRouter()
  const [search, setSearch] = useState('')

  // Reset search when palette closes
  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  // Escape closes the palette
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, setOpen])

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false)
      router.push(href)
    },
    [setOpen, router],
  )

  const groups = GROUP_ORDER.map((group) => ({
    label: group,
    items: COMMANDS.filter((c) => c.group === group),
  }))

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
            initial={{ opacity: 0, scale: 0.97, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              'fixed left-1/2 top-[20%] z-50 -translate-x-1/2',
              'w-full max-w-[560px]',
              'bg-[#1f1f23] border border-[rgba(255,255,255,0.10)] rounded-2xl',
              'shadow-[0_24px_64px_rgba(0,0,0,0.7)]',
              'overflow-hidden',
            )}
          >
            <Command label="Global command palette" shouldFilter>
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
                <Search size={15} className="text-[rgba(255,255,255,0.4)] flex-shrink-0" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search tools, pages..."
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
              <Command.List className="max-h-[400px] overflow-y-auto py-2 scrollbar-none">
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
                      '[&_[cmdk-group-heading]]:text-[10px]',
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
                          key={item.id}
                          value={`${item.label} ${item.keywords?.join(' ') ?? ''}`}
                          onSelect={() => handleSelect(item.href)}
                          className={cn(
                            'flex items-center gap-3 px-4 py-2.5 mx-1 rounded-lg',
                            'text-sm text-[rgba(255,255,255,0.8)] cursor-pointer',
                            'transition-colors duration-100 outline-none',
                            'aria-selected:bg-[rgba(245,166,35,0.08)] aria-selected:text-white',
                            'data-[selected]:bg-[rgba(245,166,35,0.08)] data-[selected]:text-white',
                          )}
                        >
                          <div className="flex-shrink-0 w-7 h-7 rounded-md bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center">
                            <Icon size={13} className="text-[rgba(255,255,255,0.45)]" />
                          </div>
                          <span className="flex-1">{item.label}</span>
                          {item.group !== 'Navigation' && (
                            <span className="text-[10px] text-[rgba(255,255,255,0.25)]">
                              {item.group}
                            </span>
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
