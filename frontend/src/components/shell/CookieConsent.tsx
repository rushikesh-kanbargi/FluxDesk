'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

const STORAGE_KEY = 'fd_cookie_consent'
type ConsentValue = 'accepted' | 'declined'

function CookieIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-[#F5A623]"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8.5" cy="9" r="1.25" fill="currentColor" />
      <circle cx="14" cy="7.5" r="1" fill="currentColor" />
      <circle cx="15.5" cy="13.5" r="1.5" fill="currentColor" />
      <circle cx="9.5" cy="14.5" r="1" fill="currentColor" />
      <circle cx="12.5" cy="11" r="0.75" fill="currentColor" />
    </svg>
  )
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) setVisible(true)
    } catch {
      // localStorage unavailable (private mode, SSR guard) — don't show banner
    }
  }, [])

  function handleConsent(value: ConsentValue) {
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // best-effort
    }
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="cookie-banner"
          role="region"
          aria-label="Cookie consent"
          className="fixed bottom-16 md:bottom-0 left-0 right-0 z-50 pointer-events-none"
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="max-w-4xl mx-auto m-3 pointer-events-auto">
            <div className="rounded-2xl bg-[#111113] border border-[rgba(255,255,255,0.10)] p-4 flex items-center gap-4 shadow-[0_8px_40px_rgba(0,0,0,0.5)]">

              {/* Icon */}
              <CookieIcon />

              {/* Text */}
              <p className="flex-1 text-sm text-[rgba(255,255,255,0.6)] font-[var(--font-sora)] leading-relaxed">
                We use cookies to improve your experience and analyse usage.{' '}
                <Link
                  href="/privacy#cookies"
                  className="text-[#F5A623] hover:underline underline-offset-2 transition-colors"
                >
                  Privacy Policy
                </Link>
                .
              </p>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleConsent('declined')}
                  className="
                    h-8 px-4 rounded-lg text-xs font-medium font-[var(--font-sora)]
                    text-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.10)]
                    hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(255,255,255,0.8)]
                    transition-colors duration-150
                  "
                >
                  Decline
                </button>
                <button
                  onClick={() => handleConsent('accepted')}
                  className="
                    h-8 px-4 rounded-lg text-xs font-semibold font-[var(--font-sora)]
                    bg-[#F5A623] text-[#09090b]
                    hover:bg-[#f7b84b]
                    transition-colors duration-150
                  "
                >
                  Accept
                </button>
              </div>

            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
