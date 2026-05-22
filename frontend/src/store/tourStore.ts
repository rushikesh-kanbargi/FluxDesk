import { create } from 'zustand'

export type TourStep = 'welcome' | 'api-keys' | 'tools' | 'library' | 'memory' | 'complete'

const TOUR_STEPS: TourStep[] = ['welcome', 'api-keys', 'tools', 'library', 'memory']

interface TourState {
  isActive: boolean
  currentStep: TourStep
  startTour: () => void
  nextStep: () => void
  prevStep: () => void
  skipTour: () => void
  completeTour: () => void
}

export const useTourStore = create<TourState>((set, get) => ({
  isActive: false,
  currentStep: 'welcome',

  startTour: () => set({ isActive: true, currentStep: 'welcome' }),

  nextStep: () => {
    const { currentStep } = get()
    const idx = TOUR_STEPS.indexOf(currentStep)
    if (idx === -1) return
    if (idx === TOUR_STEPS.length - 1) {
      set({ currentStep: 'complete' })
    } else {
      set({ currentStep: TOUR_STEPS[idx + 1] })
    }
  },

  prevStep: () => {
    const { currentStep } = get()
    const idx = TOUR_STEPS.indexOf(currentStep)
    if (idx <= 0) return
    set({ currentStep: TOUR_STEPS[idx - 1] })
  },

  skipTour: () => set({ isActive: false, currentStep: 'welcome' }),

  completeTour: () => set({ isActive: false, currentStep: 'welcome' }),
}))

export function useTour() {
  return useTourStore()
}
