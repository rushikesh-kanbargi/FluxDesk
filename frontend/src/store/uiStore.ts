import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type AIProvider = 'claude' | 'openai' | 'gemini' | 'groq'

export type RailSection = 'home' | 'projects' | 'tools' | 'pipelines' | 'library' | 'insights' | 'context' | 'settings'

interface UIState {
  // Sidebar (legacy — used by mobile nav only)
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void

  // Command palette
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void

  // Active AI provider
  activeProvider: AIProvider
  setActiveProvider: (provider: AIProvider) => void

  // Onboarding
  onboardingComplete: boolean
  setOnboardingComplete: (complete: boolean) => void
  onboardingStep: number
  setOnboardingStep: (step: number) => void

  // Keyboard shortcuts modal
  shortcutsOpen: boolean
  setShortcutsOpen: (open: boolean) => void

  // Recent tools (for "continue where you left off")
  recentTools: string[]
  addRecentTool: (toolId: string) => void

  // Shell — active rail section
  activeRailSection: RailSection
  setActiveRailSection: (section: RailSection) => void

  // Active project context (sent with every tool run)
  activeProjectId: string | null
  setActiveProjectId: (id: string | null) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      commandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

      activeProvider: 'claude',
      setActiveProvider: (provider) => set({ activeProvider: provider }),

      onboardingComplete: false,
      setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),
      onboardingStep: 0,
      setOnboardingStep: (step) => set({ onboardingStep: step }),

      shortcutsOpen: false,
      setShortcutsOpen: (open) => set({ shortcutsOpen: open }),

      recentTools: [],
      addRecentTool: (toolId) =>
        set((s) => ({
          recentTools: [toolId, ...s.recentTools.filter((t) => t !== toolId)].slice(0, 5),
        })),

      activeRailSection: 'home',
      setActiveRailSection: (section) => set({ activeRailSection: section }),

      activeProjectId: null,
      setActiveProjectId: (id) => set({ activeProjectId: id }),
    }),
    {
      name: 'fluxdesk-ui',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        activeProvider: state.activeProvider,
        onboardingComplete: state.onboardingComplete,
        recentTools: state.recentTools,
        activeRailSection: state.activeRailSection,
        activeProjectId: state.activeProjectId,
      }),
    }
  )
)
