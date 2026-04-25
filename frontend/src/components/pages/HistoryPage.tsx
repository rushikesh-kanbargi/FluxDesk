'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, ChevronRight, Search } from 'lucide-react'
import { Badge, Skeleton, EmptyState, ErrorAlert, cn } from '@/components/ui'
import { getErrorMessage } from '@/lib/errors'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { TOOL_CONFIGS } from '@/components/tools/configs'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface HistoryEntry {
  id: string
  toolId: string
  provider: string
  durationMs: number
  rating?: number
  createdAt: string
  output: string
}

function useHistory() {
  return useQuery({
    queryKey: ['history'],
    queryFn: async () => {
      const { data } = await api.get<{ recentUsage?: HistoryEntry[] }>('/memory/stats')
      return (data?.recentUsage || []) as HistoryEntry[]
    },
    staleTime: 30_000,
  })
}

export default function HistoryPage() {
  const { data: history, isLoading, isError, error, refetch } = useHistory()
  const [search, setSearch] = useState('')

  const filtered = (history || []).filter((h) => {
    const config = TOOL_CONFIGS[h.toolId]
    return !search || config?.name.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto px-5 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-ink">History</h1>
            <p className="text-xs text-ink-dim mt-0.5">All your recent tool runs</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by tool..."
            className={cn(
              'w-full h-8 pl-8 pr-3 bg-[#111113] border border-[rgba(255,255,255,0.08)] rounded-md',
              'text-sm text-ink placeholder:text-ink-dim',
              'focus:outline-none focus:border-[rgba(245,166,35,0.4)] transition-colors',
            )}
          />
        </div>

        {isError && (
          <ErrorAlert
            title="Could not load history"
            message={getErrorMessage(error, 'Request failed.')}
            onRetry={() => void refetch()}
            className="mb-4"
          />
        )}

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl border border-[rgba(255,255,255,0.06)] flex items-center gap-4">
                <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        ) : !filtered.length ? (
          <EmptyState
            illustration="history"
            title="No history yet"
            description="Your tool runs will appear here"
            action={
              <Link href="/dashboard">
                <button className="text-sm text-amber hover:underline">Go to dashboard →</button>
              </Link>
            }
          />
        ) : (
          <motion.div
            className="space-y-2"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.025 } } }}
          >
            {filtered.map((entry) => {
              const config = TOOL_CONFIGS[entry.toolId]
              if (!config) return null
              return (
                <motion.div
                  key={entry.id}
                  variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                >
                  <Link href={`/tools/${entry.toolId}`}>
                    <div className={cn(
                      'group flex items-center gap-4 p-4 rounded-xl',
                      'border border-[rgba(255,255,255,0.06)] bg-[#111113]',
                      'hover:border-[rgba(255,255,255,0.12)] hover:bg-[#18181b]',
                      'transition-all duration-150 cursor-pointer',
                    )}>
                      {/* Icon */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center">
                        <Clock size={14} className="text-ink-dim" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-ink">{config.name}</span>
                          <Badge variant="default" className="text-[10px] capitalize">{entry.provider}</Badge>
                        </div>
                        <p className="text-xs text-ink-dim mt-0.5 truncate">{entry.output?.slice(0, 80)}...</p>
                      </div>

                      {/* Meta */}
                      <div className="flex-shrink-0 text-right">
                        <p className="text-xs text-ink-dim">
                          {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                        </p>
                        <p className="text-[10px] text-ink-dim mt-0.5">{(entry.durationMs / 1000).toFixed(1)}s</p>
                      </div>

                      <ChevronRight size={13} className="text-ink-dim opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>
    </div>
  )
}
