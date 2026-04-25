'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'
import { useRouter } from 'next/navigation'

export function useKeyboardShortcuts() {
  const { setCommandPaletteOpen, toggleSidebar, setShortcutsOpen } = useUIStore()
  const router = useRouter()

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey

      // Cmd+K → toggle command palette
      if (meta && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(!useUIStore.getState().commandPaletteOpen)
        return
      }

      // [ → toggle sidebar (when not in input)
      if (e.key === '[' && !isInputFocused()) {
        e.preventDefault()
        toggleSidebar()
        return
      }

      // ? → open shortcuts modal (when not in input)
      if (e.key === '?' && !isInputFocused()) {
        e.preventDefault()
        setShortcutsOpen(true)
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setCommandPaletteOpen, toggleSidebar, setShortcutsOpen, router])
}

function isInputFocused() {
  const el = document.activeElement
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLElement && el.isContentEditable)
  )
}
