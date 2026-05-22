'use client'

import { useEffect, useRef, useState } from 'react'
import { useUIStore } from '@/store/uiStore'
import { useRouter } from 'next/navigation'

export function useKeyboardShortcuts() {
  const { setCommandPaletteOpen, toggleSidebar, setShortcutsOpen } = useUIStore()
  const router = useRouter()

  const [gPressed, setGPressed] = useState(false)
  const gTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey

      // Cmd+K → toggle command palette
      if (meta && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(!useUIStore.getState().commandPaletteOpen)
        return
      }

      // Cmd+N → new prompt
      if (meta && !e.shiftKey && e.key === 'n') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('fd:new-prompt'))
        return
      }

      // Cmd+Shift+N → new pipeline
      if (meta && e.shiftKey && e.key === 'N') {
        e.preventDefault()
        router.push('/pipelines?create=true')
        return
      }

      // Cmd+, → open settings
      if (meta && e.key === ',') {
        e.preventDefault()
        router.push('/settings')
        return
      }

      // Cmd+E → export prompts
      if (meta && e.key === 'e') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('fd:export-prompts'))
        return
      }

      // Cmd+/ → keyboard shortcuts modal
      if (meta && e.key === '/') {
        e.preventDefault()
        setShortcutsOpen(true)
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

      // vim-style g-prefix navigation (when not in input, no meta)
      if (!meta && !isInputFocused() && e.key === 'g') {
        e.preventDefault()
        setGPressed(true)
        if (gTimer.current) clearTimeout(gTimer.current)
        gTimer.current = setTimeout(() => setGPressed(false), 1500)
        return
      }

      if (gPressed && !isInputFocused()) {
        setGPressed(false)
        if (gTimer.current) clearTimeout(gTimer.current)
        switch (e.key) {
          case 't': router.push('/dashboard'); break   // Go to tools
          case 'p': router.push('/library'); break     // Go to prompts
          case 'l': router.push('/pipelines'); break   // Go to pipelines
          case 'a': router.push('/activity'); break    // Go to activity
        }
        e.preventDefault()
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [gPressed, setCommandPaletteOpen, toggleSidebar, setShortcutsOpen, router])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (gTimer.current) clearTimeout(gTimer.current)
    }
  }, [])

  return { gPressed }
}

function isInputFocused() {
  const el = document.activeElement
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLElement && el.isContentEditable)
  )
}
