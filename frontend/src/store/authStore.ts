import { create } from 'zustand'
import { createClient } from '@/lib/supabase'
import type { User, Session, Subscription } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  init: () => Promise<void>
  signOut: () => Promise<void>
}

let authSubscription: Subscription | null = null

export function cleanupAuthListener() {
  authSubscription?.unsubscribe()
  authSubscription = null
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,

  init: async () => {
    const supabase = createClient()

    // Get initial session
    const { data: { session } } = await supabase.auth.getSession()
    set({ user: session?.user ?? null, session, loading: false })

    // Unsubscribe any previous listener before registering a new one
    // (guards against double-init in StrictMode / HMR)
    cleanupAuthListener()

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null, session })
    })
    authSubscription = subscription
  },

  signOut: async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    set({ user: null, session: null })
  },
}))
