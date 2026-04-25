'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/components/ui'
import { Sidebar } from './Sidebar'
import { CommandPalette } from './CommandPalette'
import { OnboardingModal } from './OnboardingModal'
import { LayoutDashboard, Library, History, Search, Settings } from 'lucide-react'

// ── Mobile bottom nav items ────────────────────────────────────
const MOBILE_NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/library',   icon: Library,         label: 'Library' },
  { href: '/history',   icon: History,          label: 'History' },
  { href: '/settings',  icon: Settings,         label: 'Settings' },
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

// ── AppShell ───────────────────────────────────────────────────
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, init } = useAuthStore()

  // Subscribe to Supabase auth state changes
  useEffect(() => {
    init()
  }, [init])

  useKeyboardShortcuts()

  // Show nothing while session is initializing — middleware already guards the route
  if (loading) return null

  return (
    <div className="flex h-dvh overflow-hidden bg-[#09090b]">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main content — extra bottom padding on mobile to clear the bottom nav */}
      <main className="flex-1 overflow-auto min-w-0 pb-16 md:pb-0">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <MobileBottomNav />

      {/* Command palette — shared across all viewports */}
      <CommandPalette />

      {/* Onboarding */}
      <OnboardingModal />
    </div>
  )
}
