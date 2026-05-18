'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Zap, Sparkles, GitPullRequest, Bug, GitCommit, FileText,
  ClipboardList, Users, Layers, BookOpen, CreditCard, BarChart2,
  Video, MessageSquare, AlertTriangle, EyeOff, TrendingUp,
  ArrowRightLeft, Mail, Brain, MessageCircle,
  Plus, Activity, LayoutDashboard, type LucideIcon,
} from 'lucide-react'
import { cn } from '@/components/ui'
import { useUIStore, type RailSection } from '@/store/uiStore'
import { useProjects } from '@/hooks/useProjects'
import { useAuthStore } from '@/store/authStore'

// ── Tool nav groups ────────────────────────────────────────────
interface NavItem { id: string; label: string; href: string; icon: LucideIcon; isNew?: boolean }
interface NavGroup { label: string; color: string; items: NavItem[] }

const TOOL_GROUPS: NavGroup[] = [
  {
    label: 'Prompting', color: '#F5A623',
    items: [
      { id: 'forge',    label: 'PromptForge',     href: '/tools/forge',    icon: Zap },
      { id: 'improver', label: 'Prompt Improver', href: '/tools/improver', icon: Sparkles },
    ],
  },
  {
    label: 'Development', color: '#34d399',
    items: [
      { id: 'code-review', label: 'Code Review',   href: '/tools/code-review', icon: GitPullRequest },
      { id: 'bug-task',    label: 'Bug → Task',    href: '/tools/bug-task',    icon: Bug },
      { id: 'commit',      label: 'Commit Writer', href: '/tools/commit',      icon: GitCommit },
      { id: 'adr',         label: 'ADR Generator', href: '/tools/adr',         icon: FileText },
    ],
  },
  {
    label: 'Planning', color: '#38bdf8',
    items: [
      { id: 'feature-spec', label: 'Feature Spec',       href: '/tools/feature-spec', icon: ClipboardList },
      { id: 'standup',      label: 'Standup Writer',     href: '/tools/standup',      icon: Users },
      { id: 'tech-stack',   label: 'Tech Stack Advisor', href: '/tools/tech-stack',   icon: Layers },
    ],
  },
  {
    label: 'Learning', color: '#a78bfa',
    items: [
      { id: 'concept-explainer', label: 'Concept Explainer', href: '/tools/concept-explainer', icon: BookOpen },
      { id: 'flashcards',        label: 'Flashcard Factory', href: '/tools/flashcards',        icon: CreditCard },
      { id: 'compare',           label: 'Model Comparator',  href: '/tools/compare',           icon: BarChart2 },
    ],
  },
  {
    label: 'Workplace', color: '#fb923c',
    items: [
      { id: 'meeting-mirror',         label: 'Meeting Mirror',         href: '/tools/meeting-mirror',         icon: Video,          isNew: true },
      { id: 'stakeholder-translator', label: 'Stakeholder Translator', href: '/tools/stakeholder-translator', icon: MessageSquare,  isNew: true },
      { id: 'decision-autopsy',       label: 'Decision Autopsy',       href: '/tools/decision-autopsy',       icon: AlertTriangle,  isNew: true },
      { id: 'silence-detector',       label: 'Silence Detector',       href: '/tools/silence-detector',       icon: EyeOff },
      { id: 'complexity-budget',      label: 'Complexity Budget',      href: '/tools/complexity-budget',      icon: TrendingUp },
      { id: 'context-handoff',        label: 'Context Handoff',        href: '/tools/context-handoff',        icon: ArrowRightLeft, isNew: true },
      { id: 'email-intent-decoder',   label: 'Email Intent Decoder',   href: '/tools/email-intent-decoder',   icon: Mail,           isNew: true },
      { id: 'work-brain-dump',        label: 'Work Brain Dump',        href: '/tools/work-brain-dump',        icon: Brain },
      { id: 'feedback-translator',    label: 'Feedback Translator',    href: '/tools/feedback-translator',    icon: MessageCircle,  isNew: true },
    ],
  },
]

const SECTION_TITLES: Record<RailSection, string> = {
  home:     'Dashboard',
  projects: 'Projects',
  tools:    'All Tools',
  library:  'Library',
  settings: 'Settings',
}

// ── Sub-panels ─────────────────────────────────────────────────

function HomeSubPanel({ pathname }: { pathname: string }) {
  const items = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/activity',  icon: Activity,        label: 'Activity Feed' },
  ]
  return (
    <div className="px-2 space-y-0.5">
      {items.map(({ href, icon: Icon, label }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs transition-colors',
              active
                ? 'bg-[rgba(245,166,35,0.10)] text-[#F5A623] font-medium'
                : 'text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]',
            )}
          >
            <Icon size={13} className="flex-shrink-0" />
            {label}
          </Link>
        )
      })}
    </div>
  )
}

function ProjectsSubPanel({ pathname }: { pathname: string }) {
  const { data: projects, isLoading } = useProjects()
  const setActiveProjectId = useUIStore((s) => s.setActiveProjectId)
  const activeProjectId = useUIStore((s) => s.activeProjectId)

  return (
    <div className="px-2 space-y-0.5">
      <Link
        href="/projects"
        className={cn(
          'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs transition-colors',
          pathname === '/projects'
            ? 'bg-[rgba(245,166,35,0.10)] text-[#F5A623] font-medium'
            : 'text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]',
        )}
      >
        All Projects
      </Link>

      {isLoading && (
        <div className="px-2 py-2 text-[10px] text-[rgba(255,255,255,0.25)]">Loading…</div>
      )}

      {projects?.map((p) => {
        const isActive = pathname === `/projects/${p.id}`
        const isSelected = activeProjectId === p.id
        return (
          <div key={p.id} className="flex items-center gap-1">
            <Link
              href={`/projects/${p.id}`}
              className={cn(
                'flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                isActive
                  ? 'bg-[rgba(245,166,35,0.10)] text-[#F5A623] font-medium'
                  : 'text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]',
              )}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: p.color }}
              />
              <span className="truncate">{p.name}</span>
            </Link>
            <button
              onClick={() => setActiveProjectId(isSelected ? null : p.id)}
              className={cn(
                'w-4 h-4 rounded border text-[9px] flex items-center justify-center transition-colors flex-shrink-0',
                isSelected
                  ? 'border-[#F5A623] bg-[rgba(245,166,35,0.15)] text-[#F5A623]'
                  : 'border-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.25)] hover:border-[rgba(255,255,255,0.3)]',
              )}
              title={isSelected ? 'Remove from context' : 'Set as active project'}
            >
              ✓
            </button>
          </div>
        )
      })}

      <Link
        href="/projects"
        className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-[rgba(255,255,255,0.3)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors mt-1"
      >
        <Plus size={11} />
        Manage projects
      </Link>
    </div>
  )
}

function ToolsSubPanel({ pathname }: { pathname: string }) {
  return (
    <div>
      {TOOL_GROUPS.map((group) => (
        <div key={group.label} className="mb-2">
          <div className="px-4 py-1">
            <span
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: group.color, opacity: 0.6 }}
            >
              {group.label}
            </span>
          </div>
          {group.items.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  'relative flex items-center gap-2.5 mx-2 my-0.5 px-2 py-1.5 rounded-md text-xs transition-colors',
                  isActive
                    ? 'bg-[rgba(245,166,35,0.10)] text-[#F5A623] font-medium'
                    : 'text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]',
                )}
              >
                <Icon size={13} className="flex-shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.isNew && (
                  <span className="ml-auto inline-flex items-center px-1 py-px rounded text-[9px] font-semibold bg-[rgba(245,166,35,0.15)] text-[#F5A623] border border-[rgba(245,166,35,0.25)]">
                    NEW
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function LibrarySubPanel({ pathname }: { pathname: string }) {
  return (
    <div className="px-2">
      <Link
        href="/library"
        className={cn(
          'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs transition-colors',
          pathname === '/library'
            ? 'bg-[rgba(245,166,35,0.10)] text-[#F5A623] font-medium'
            : 'text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]',
        )}
      >
        Saved Prompts
      </Link>
    </div>
  )
}

function SettingsSubPanel({ pathname }: { pathname: string }) {
  const signOut = useAuthStore((s) => s.signOut)
  const router = useRouter()

  return (
    <div className="px-2 space-y-0.5">
      <Link
        href="/settings"
        className={cn(
          'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs transition-colors',
          pathname === '/settings'
            ? 'bg-[rgba(245,166,35,0.10)] text-[#F5A623] font-medium'
            : 'text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]',
        )}
      >
        Preferences
      </Link>
      <button
        onClick={() => signOut().then(() => router.push('/login')).catch(() => router.push('/login'))}
        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs text-[rgba(255,255,255,0.5)] hover:text-rose-400 hover:bg-[rgba(255,255,255,0.04)] transition-colors text-left"
      >
        Sign out
      </button>
    </div>
  )
}

// ── SubPanel ───────────────────────────────────────────────────
export function SubPanel() {
  const pathname = usePathname()
  const activeSection = useUIStore((s) => s.activeRailSection)
  const user = useAuthStore((s) => s.user)

  return (
    <div className="flex flex-col h-full w-[220px] flex-shrink-0 bg-[#111113] border-r border-[rgba(255,255,255,0.06)] overflow-hidden">
      {/* Section header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
        <span className="text-xs font-semibold text-white">
          {SECTION_TITLES[activeSection]}
        </span>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto scrollbar-none py-2">
        {activeSection === 'home'     && <HomeSubPanel     pathname={pathname} />}
        {activeSection === 'projects' && <ProjectsSubPanel pathname={pathname} />}
        {activeSection === 'tools'    && <ToolsSubPanel    pathname={pathname} />}
        {activeSection === 'library'  && <LibrarySubPanel  pathname={pathname} />}
        {activeSection === 'settings' && <SettingsSubPanel pathname={pathname} />}
      </div>

      {/* User row at bottom */}
      <div className="border-t border-[rgba(255,255,255,0.06)] p-3 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-[rgba(245,166,35,0.15)] border border-[rgba(245,166,35,0.3)] flex items-center justify-center text-[10px] font-semibold text-[#F5A623] flex-shrink-0">
            {user?.user_metadata?.name?.[0]?.toUpperCase() ??
              user?.email?.[0]?.toUpperCase() ??
              'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">
              {user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? 'User'}
            </div>
            <div className="text-[10px] text-[rgba(255,255,255,0.3)] truncate">
              {user?.email}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
