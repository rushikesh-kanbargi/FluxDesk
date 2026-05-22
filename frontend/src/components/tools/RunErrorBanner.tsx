'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, Key, RefreshCw, Clock } from 'lucide-react'
import { cn } from '@/components/ui'
import Link from 'next/link'

interface RunErrorBannerProps {
  error: string | null
  errorCode?: number | null
  retryAfterSec?: number | null
  onRetry?: () => void
}

export function RunErrorBanner({ error, errorCode, retryAfterSec, onRetry }: RunErrorBannerProps) {
  const [countdown, setCountdown] = useState(0)

  // Sync countdown whenever a new retryAfterSec arrives
  useEffect(() => {
    setCountdown(retryAfterSec ?? 0)
  }, [retryAfterSec])

  // Tick down
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  if (!error) return null

  const isNoKey = errorCode === 402
  const isRateLimit = errorCode === 429
  const canRetry = !!onRetry && !isNoKey && countdown <= 0

  return (
    <div
      className={cn(
        'mx-5 mt-3 rounded-lg border p-3 flex items-start gap-2.5',
        isRateLimit
          ? 'border-amber-500/20 bg-amber-500/8'
          : 'border-red-500/20 bg-red-500/10',
      )}
    >
      {isRateLimit ? (
        <Clock size={14} className="text-amber mt-0.5 flex-shrink-0" />
      ) : isNoKey ? (
        <Key size={14} className="text-rose mt-0.5 flex-shrink-0" />
      ) : (
        <AlertCircle size={14} className="text-rose mt-0.5 flex-shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm text-red-400 leading-snug">{error}</p>
        {isRateLimit && countdown > 0 && (
          <p className="text-xs text-ink-dim mt-1">Retry available in {countdown}s</p>
        )}
      </div>

      <div className="flex-shrink-0 flex items-center gap-2 ml-1">
        {isNoKey && (
          <Link
            href="/settings/keys"
            className="text-xs font-semibold text-amber hover:text-amber/80 transition-colors"
          >
            Add key
          </Link>
        )}
        {canRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1 text-xs font-medium text-ink-dim hover:text-ink transition-colors"
          >
            <RefreshCw size={11} />
            Retry
          </button>
        )}
        {isRateLimit && countdown <= 0 && onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber hover:text-amber/80 transition-colors"
          >
            <RefreshCw size={11} />
            Retry now
          </button>
        )}
      </div>
    </div>
  )
}
