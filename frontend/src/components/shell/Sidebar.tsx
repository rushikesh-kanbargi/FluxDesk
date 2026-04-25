'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Zap, Sparkles, GitPullRequest, Bug, GitCommit,
  FileText, ClipboardList, Users, Layers, BookOpen, CreditCard,
  BarChart2, Video, MessageSquare, AlertTriangle, EyeOff,
  TrendingUp, ArrowRightLeft, Mail, Brain, MessageCircle,
  Library, History, Settings, LogOut, Search,
  type LucideIcon,
} from 'lucide-react'
import { cn, Tooltip } from '@/components/ui'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { AI_PROVIDERS, type AIProvider } from '@/types'

// ── Types ──────────────────────────────────────────────────────
interface NavItem {
  id: string
  label: string
  href: string
  icon: LucideIcon
}

interface NavGroup {
  label: string
  items: NavItem[]
}

// ── Nav data ───────────────────────────────────────────────────
const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { id: 'library',   label: 'Library',   href: '/library',   icon: Library },
      { id: 'history',   label: 'History',   href: '/history',   icon: History },
    ],
  },
  {
    label: 'Prompting',
    items: [
      { id: 'forge',    label: 'PromptForge',     href: '/tools/forge',    icon: Zap },
      { id: 'improver', label: 'Prompt Improver', href: '/tools/improver', icon: Sparkles },
    ],
  },
  {
    label: 'Development',
    items: [
      { id: 'code-review', label: 'Code Review',   href: '/tools/code-review', icon: GitPullRequest },
      { id: 'bug-task',    label: 'Bug → Task',    href: '/tools/bug-task',    icon: Bug },
      { id: 'commit',      label: 'Commit Writer', href: '/tools/commit',      icon: GitCommit },
      { id: 'adr',         label: 'ADR Generator', href: '/tools/adr',         icon: FileText },
    ],
  },
  {
    label: 'Planning',
    items: [
      { id: 'feature-spec', label: 'Feature Spec',      href: '/tools/feature-spec', icon: ClipboardList },
      { id: 'standup',      label: 'Standup Writer',    href: '/tools/standup',      icon: Users },
      { id: 'tech-stack',   label: 'Tech Stack Advisor', href: '/tools/tech-stack',  icon: Layers },
    ],
  },
  {
    label: 'Learning',
    items: [
      { id: 'concept-explainer', label: 'Concept Explainer',  href: '/tools/concept-explainer', icon: BookOpen },
      { id: 'flashcards',        label: 'Flashcard Factory',  href: '/tools/flashcards',        icon: CreditCard },
      { id: 'compare',           label: 'Model Comparator',   href: '/tools/compare',           icon: BarChart2 },
    ],
  },
  {
    label: 'Workplace',
    items: [
      { id: 'meeting-mirror',        label: 'Meeting Mirror',        href: '/tools/meeting-mirror',        icon: Video },
      { id: 'stakeholder-translator', label: 'Stakeholder Translator', href: '/tools/stakeholder-translator', icon: MessageSquare },
      { id: 'decision-autopsy',      label: 'Decision Autopsy',      href: '/tools/decision-autopsy',      icon: AlertTriangle },
      { id: 'silence-detector',      label: 'Silence Detector',      href: '/tools/silence-detector',      icon: EyeOff },
      { id: 'complexity-budget',     label: 'Complexity Budget',     href: '/tools/complexity-budget',     icon: TrendingUp },
      { id: 'context-handoff',       label: 'Context Handoff',       href: '/tools/context-handoff',       icon: ArrowRightLeft },
      { id: 'email-intent-decoder',  label: 'Email Intent Decoder',  href: '/tools/email-intent-decoder',  icon: Mail },
      { id: 'work-brain-dump',       label: 'Work Brain Dump',       href: '/tools/work-brain-dump',       icon: Brain },
      { id: 'feedback-translator',   label: 'Feedback Translator',   href: '/tools/feedback-translator',   icon: MessageCircle },
    ],
  },
]

const BOTTOM_NAV: NavItem[] = [
  { id: 'settings', label: 'Settings', href: '/settings', icon: Settings },
]

const GROUP_COLORS: Record<string, string> = {
  Overview:    'rgba(255,255,255,0.9)',
  Prompting:   '#F5A623',
  Development: '#34d399',
  Planning:    '#38bdf8',
  Learning:    '#a78bfa',
  Workplace:   '#fb923c',
}

// ── Sidebar ────────────────────────────────────────────────────
export function Sidebar() {
  const [isHovered, setIsHovered] = useState(false)
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen)
  const activeProvider = useUIStore((s) => s.activeProvider)
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const pathname = usePathname()

  const expanded = isHovered || sidebarOpen

  return (
    <motion.nav
      animate={{ width: expanded ? 220 : 56 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={cn(
        'relative flex flex-col h-full',
        'bg-[#111113] border-r border-[rgba(255,255,255,0.06)]',
        'overflow-hidden flex-shrink-0 z-20',
      )}
    >
      {/* ── Logo ── */}
      <div className="flex items-center h-14 px-3.5 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-[rgba(245,166,35,0.15)] border border-[rgba(245,166,35,0.3)] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L12 4.5V9.5L7 13L2 9.5V4.5L7 1Z" fill="#F5A623" fillOpacity="0.9" />
              <path d="M7 4L9.5 5.5V8.5L7 10L4.5 8.5V5.5L7 4Z" fill="#09090b" />
            </svg>
          </div>
          <AnimatePresence>
            {expanded && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="text-sm font-semibold text-white tracking-tight whitespace-nowrap overflow-hidden"
                style={{ fontFamily: 'var(--font-sora)' }}
              >
                FluxDesk
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* ── Search / Cmd+K ── */}
      <div className="px-2 py-2 border-b border-[rgba(255,255,255,0.06)]">
        <Tooltip content="Search (⌘K)" side="right">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className={cn(
              'flex items-center w-full rounded-md',
              'bg-transparent border border-[rgba(255,255,255,0.06)]',
              'hover:bg-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.10)]',
              'transition-colors duration-150',
              expanded
                ? 'gap-2.5 px-2.5 h-8'
                : 'justify-center h-8 w-8 mx-auto border-transparent',
            )}
          >
            <Search size={13} className="text-[rgba(255,255,255,0.4)] flex-shrink-0" />
            <AnimatePresence>
              {expanded && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-[rgba(255,255,255,0.4)] whitespace-nowrap flex items-center gap-1"
                >
                  Search...
                  <span className="px-1 py-0.5 rounded text-[10px] bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.25)]">
                    ⌘K
                  </span>
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </Tooltip>
      </div>

      {/* ── Navigation groups ── */}
      <div className="flex-1 overflow-y-auto scrollbar-none py-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-1">
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-3 py-1.5"
                >
                  <span
                    className="text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: GROUP_COLORS[group.label] || 'rgba(255,255,255,0.3)', opacity: 0.5 }}
                  >
                    {group.label}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {group.items.map((item) => (
              <NavLink
                key={item.id}
                item={item}
                isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                expanded={expanded}
              />
            ))}
          </div>
        ))}
      </div>

      {/* ── Bottom section ── */}
      <div className="border-t border-[rgba(255,255,255,0.06)] pt-1 pb-2 flex-shrink-0">
        {BOTTOM_NAV.map((item) => (
          <NavLink
            key={item.id}
            item={item}
            isActive={pathname === item.href}
            expanded={expanded}
          />
        ))}

        {/* User row */}
        <div
          className={cn(
            'flex items-center mx-2 mt-1 rounded-md cursor-default',
            'hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-150',
            expanded ? 'px-2 py-2 gap-2.5' : 'justify-center p-2',
          )}
        >
          {/* Avatar */}
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[rgba(245,166,35,0.15)] border border-[rgba(245,166,35,0.3)] flex items-center justify-center text-[10px] font-semibold text-[#F5A623]">
            {user?.user_metadata?.name?.[0]?.toUpperCase() ??
              user?.email?.[0]?.toUpperCase() ??
              'U'}
          </div>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-white truncate">
                    {user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? 'User'}
                  </span>
                  {/* Active provider dot */}
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor:
                        AI_PROVIDERS[activeProvider as AIProvider]?.color ?? '#F5A623',
                    }}
                    title={`Using ${activeProvider}`}
                  />
                </div>
                <span className="text-[10px] text-[rgba(255,255,255,0.3)] truncate block">
                  {AI_PROVIDERS[activeProvider as AIProvider]?.label ?? 'Claude'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {expanded && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => signOut()}
                className="p-1 rounded text-[rgba(255,255,255,0.35)] hover:text-rose-400 transition-colors"
                title="Sign out"
              >
                <LogOut size={12} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.nav>
  )
}

// ── NavLink ────────────────────────────────────────────────────
function NavLink({
  item,
  isActive,
  expanded,
}: {
  item: NavItem
  isActive: boolean
  expanded: boolean
}) {
  const Icon = item.icon

  return (
    <Tooltip content={item.label} side="right" delay={expanded ? 99999 : 200}>
      <Link
        href={item.href}
        className={cn(
          'relative flex items-center gap-2.5 mx-2 my-0.5 rounded-md',
          'transition-colors duration-150 group',
          expanded ? 'px-2 py-1.5 h-8' : 'justify-center h-8 w-8',
          isActive
            ? 'bg-[rgba(245,166,35,0.10)] border border-[rgba(245,166,35,0.2)]'
            : 'border border-transparent hover:bg-[rgba(255,255,255,0.04)]',
        )}
      >
        <Icon
          size={14}
          className="flex-shrink-0 transition-colors duration-150"
          style={{ color: isActive ? '#F5A623' : 'rgba(255,255,255,0.45)' }}
        />
        <AnimatePresence>
          {expanded && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                'text-xs whitespace-nowrap overflow-hidden',
                isActive
                  ? 'font-medium text-[#F5A623]'
                  : 'font-normal text-[rgba(255,255,255,0.55)] group-hover:text-white',
              )}
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Active indicator pill on collapsed state */}
        {isActive && !expanded && (
          <span className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#F5A623] rounded-l-full" />
        )}
      </Link>
    </Tooltip>
  )
}
