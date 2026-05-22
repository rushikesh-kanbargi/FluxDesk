'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Folder,
  Grid3X3,
  Workflow,
  Book,
  TrendingUp,
  Brain,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { cn, Tooltip } from '@/components/ui'
import { useUIStore, type RailSection } from '@/store/uiStore'
import { usePipelineRunStore } from '@/store/pipelineRunStore'

interface RailItem {
  id: RailSection
  icon: LucideIcon
  label: string
  href: string
}

const RAIL_TOP: RailItem[] = [
  { id: 'home',      icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { id: 'projects',  icon: Folder,          label: 'Projects',  href: '/projects' },
  { id: 'tools',     icon: Grid3X3,         label: 'All Tools', href: '/dashboard' },
  { id: 'pipelines', icon: Workflow,        label: 'Pipelines', href: '/pipelines' },
  { id: 'library',   icon: Book,            label: 'Library',   href: '/library' },
  { id: 'insights',  icon: TrendingUp,      label: 'Insights',  href: '/insights' },
  { id: 'context',   icon: Brain,           label: 'My Context', href: '/dashboard' },
]

const RAIL_BOTTOM: RailItem[] = [
  { id: 'settings', icon: Settings, label: 'Settings', href: '/settings' },
]

function sectionFromPath(pathname: string): RailSection {
  if (pathname.startsWith('/projects'))  return 'projects'
  if (pathname.startsWith('/tools'))     return 'tools'
  if (pathname.startsWith('/pipelines')) return 'pipelines'
  if (pathname.startsWith('/library'))   return 'library'
  if (pathname.startsWith('/insights'))  return 'insights'
  if (pathname.startsWith('/settings'))  return 'settings'
  return 'home'
}

interface RailButtonProps {
  item: RailItem
  isActive: boolean
  onActivate: (id: RailSection) => void
}

function RailButton({ item, isActive, onActivate }: RailButtonProps) {
  const Icon = item.icon
  const pipelineRunning = usePipelineRunStore(
    (s) => item.id === 'pipelines' && s.activeRun?.overallStatus === 'running',
  )
  return (
    <Tooltip content={item.label} side="right" delay={200}>
      <Link
        href={item.href}
        onClick={() => onActivate(item.id)}
        className={cn(
          'relative flex items-center justify-center w-9 h-9 mx-auto rounded-lg',
          'transition-colors duration-150',
          isActive
            ? 'bg-[rgba(245,166,35,0.12)] text-[#F5A623]'
            : 'text-[rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(255,255,255,0.7)]',
        )}
      >
        <Icon size={16} />
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-0.5 h-5 bg-[#F5A623] rounded-r-full" />
        )}
        {pipelineRunning && (
          <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-[#F5A623] animate-pulse" />
        )}
      </Link>
    </Tooltip>
  )
}

export function IconRail() {
  const pathname = usePathname()
  const activeSection = useUIStore((s) => s.activeRailSection)
  const setActiveRailSection = useUIStore((s) => s.setActiveRailSection)

  useEffect(() => {
    setActiveRailSection(sectionFromPath(pathname))
  }, [pathname, setActiveRailSection])

  return (
    <div className="flex flex-col h-full w-[52px] flex-shrink-0 bg-[#111113] border-r border-[rgba(255,255,255,0.06)]">
      {/* Logo */}
      <div className="flex items-center justify-center h-14 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
        <Tooltip content="FluxDesk" side="right" delay={200}>
          <Link href="/dashboard">
            <div className="w-7 h-7 rounded-lg bg-[rgba(245,166,35,0.15)] border border-[rgba(245,166,35,0.3)] flex items-center justify-center hover:bg-[rgba(245,166,35,0.22)] transition-colors">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L12 4.5V9.5L7 13L2 9.5V4.5L7 1Z" fill="#F5A623" fillOpacity="0.9" />
                <path d="M7 4L9.5 5.5V8.5L7 10L4.5 8.5V5.5L7 4Z" fill="#09090b" />
              </svg>
            </div>
          </Link>
        </Tooltip>
      </div>

      {/* Top items */}
      <div className="flex flex-col gap-1 py-3 flex-1">
        {RAIL_TOP.map((item) => (
          <RailButton
            key={item.id}
            item={item}
            isActive={activeSection === item.id}
            onActivate={setActiveRailSection}
          />
        ))}
      </div>

      {/* Bottom items */}
      <div className="flex flex-col gap-1 py-3 border-t border-[rgba(255,255,255,0.06)] flex-shrink-0">
        {RAIL_BOTTOM.map((item) => (
          <RailButton
            key={item.id}
            item={item}
            isActive={activeSection === item.id}
            onActivate={setActiveRailSection}
          />
        ))}
      </div>
    </div>
  )
}
