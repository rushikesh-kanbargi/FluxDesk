'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/components/ui'
import { IconRail } from './IconRail'
import { SubPanel } from './SubPanel'
import { Topbar } from './Topbar'
import { CommandPalette } from './CommandPalette'
import { OnboardingModal } from './OnboardingModal'
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal'
import { VimModeIndicator } from './VimModeIndicator'
import { LayoutDashboard, Grid3X3, Book, Settings, Search } from 'lucide-react'

const MOBILE_NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/projects',  icon: Grid3X3,         label: 'Projects' },
  { href: '/library',   icon: Book,            label: 'Library' },
  { href: '/settings',  icon: Settings,        label: 'Settings' },
] as const

function MobileBottomNav() {
  const pathname = usePathname()
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen)

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 h-16 bg-[#111113] border-t border-[rgba(255,255,255,0.06)] flex items-center justify-around px-2">
      {MOBILE_NAV.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-1 px-4 py-2 rounded-xl',
              'transition-colors duration-150',
              active ? 'text-[#F5A623]' : 'text-[rgba(255,255,255,0.4)]',
            )}
          >
            <Icon size={18} />
            <span className="text-[10px]">{label}</span>
          </Link>
        )
      })}
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-[rgba(255,255,255,0.4)] transition-colors hover:text-[rgba(255,255,255,0.7)]"
      >
        <Search size={18} />
        <span className="text-[10px]">Search</span>
      </button>
    </nav>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { loading, init } = useAuthStore()
  const { gPressed } = useKeyboardShortcuts()

  useEffect(() => {
    init()
  }, [init])

  if (loading) return null

  return (
    <div className="flex h-dvh overflow-hidden bg-[#09090b]">
      {/* Desktop three-column shell */}
      <div className="hidden md:flex">
        <IconRail />
        <SubPanel />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-hidden min-w-0 flex flex-col pb-16 md:pb-0">
        <Topbar />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MobileBottomNav />

      {/* Shared modals */}
      <CommandPalette />
      <OnboardingModal />
      <KeyboardShortcutsModal />

      {/* Vim mode indicator */}
      <VimModeIndicator active={gPressed} />
    </div>
  )
}
