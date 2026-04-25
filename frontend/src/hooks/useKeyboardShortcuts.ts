'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'
import { useRouter } from 'next/navigation'

export function useKeyboardShortcuts() {
  const { setCommandPaletteOpen, toggleSidebar } = useUIStore()
  const router = useRouter()

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey

      // Cmd+K → command palette
      if (meta && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
        return
      }

      // [ → toggle sidebar (when not in input)
      if (e.key === '[' && !isInputFocused()) {
        e.preventDefault()
        toggleSidebar()
        return
      }

      // ? → shortcuts modal (to be implemented per page)
      // Cmd+S handled per-page
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setCommandPaletteOpen, toggleSidebar, router])
}

function isInputFocused() {
  const el = document.activeElement
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLElement && el.isContentEditable)
  )
}
