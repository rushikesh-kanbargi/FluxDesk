'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  Clock,
  Copy,
  Check,
  Globe,
  Code2,
  Mail,
  MessageSquare,
  Zap,
  Star,
  type LucideIcon,
} from 'lucide-react'
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns'
import { useActivity, type ActivityItem } from '@/hooks/useActivity'
import { cn, Button, EmptyState, ErrorAlert, ProgressBar } from '@/components/ui'

// ── Constants ─────────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  WEB:     { label: 'Web',      color: '#3B82F6' },
  VSCODE:  { label: 'VS Code',  color: '#007ACC' },
  GMAIL:   { label: 'Gmail',    color: '#EA4335' },
  CHATBOT: { label: 'Chat Bot', color: '#8B5CF6' },
  FLOW:    { label: 'Flow',     color: '#F5A623' },
}

const PLATFORM_ICONS: Record<string, LucideIcon> = {
  WEB:     Globe,
  VSCODE:  Code2,
  GMAIL:   Mail,
  CHATBOT: MessageSquare,
  FLOW:    Zap,
}

const FILTER_PILLS = [
  { key: 'all',     label: 'All' },
  { key: 'WEB',     label: 'Web' },
  { key: 'VSCODE',  label: 'VS Code' },
  { key: 'GMAIL',   label: 'Gmail' },
  { key: 'CHATBOT', label: 'Chat Bot' },
  { key: 'FLOW',    label: 'Flows' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function toTitleCase(str: string) {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
}

function groupByDate(items: ActivityItem[]): { label: string; items: ActivityItem[] }[] {
  const map = new Map<string, ActivityItem[]>()
  for (const item of items) {
    const d = new Date(item.createdAt)
    const key = isToday(d)
      ? 'Today'
      : isYesterday(d)
      ? 'Yesterday'
      : format(d, 'MMMM d, yyyy')
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }))
}

// ── Feed row ──────────────────────────────────────────────────────────────────

function ActivityRow({ item, index }: { item: ActivityItem; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const src = SOURCE_LABELS[item.source] ?? SOURCE_LABELS.WEB
  const PlatformIcon = PLATFORM_ICONS[item.source] ?? Globe

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(item.output ?? '').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, type: 'spring', stiffness: 280, damping: 30 }}
    >
      <div
        className={cn(
          'rounded-xl border transition-colors cursor-pointer select-none',
          'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)]',
          'hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.06)]',
        )}
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Main row */}
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Platform icon */}
          <div
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${src.color}18` }}
          >
            <PlatformIcon size={13} style={{ color: src.color }} />
          </div>

          {/* Source badge */}
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
            style={{ color: src.color, backgroundColor: `${src.color}15` }}
          >
            {src.label}
          </span>

          {/* Tool name */}
          <span className="text-xs font-medium text-white truncate flex-1">
            {toTitleCase(item.toolId)}
          </span>

          {/* Provider */}
          {item.provider && (
            <span className="text-[10px] text-[rgba(255,255,255,0.3)] hidden sm:inline flex-shrink-0">
              {item.provider}
            </span>
          )}

          {/* Duration */}
          {item.durationMs != null && (
            <span className="text-[10px] text-[rgba(255,255,255,0.35)] flex items-center gap-1 flex-shrink-0 hidden md:flex">
              <Clock size={9} />
              {item.durationMs < 1000
                ? `${item.durationMs}ms`
                : `${(item.durationMs / 1000).toFixed(1)}s`}
            </span>
          )}

          {/* Project tag */}
          {item.project && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 hidden lg:inline"
              style={{
                color: item.project.color,
                backgroundColor: `${item.project.color}18`,
                border: `1px solid ${item.project.color}30`,
              }}
            >
              {item.project.name}
            </span>
          )}

          {/* Rating */}
          {item.rating != null && (
            <div className="flex items-center gap-0.5 flex-shrink-0 hidden sm:flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={9}
                  className={i < item.rating! ? 'text-[#F5A623] fill-[#F5A623]' : 'text-[rgba(255,255,255,0.15)]'}
                />
              ))}
            </div>
          )}

          {/* Timestamp */}
          <span className="text-[10px] text-[rgba(255,255,255,0.3)] flex-shrink-0">
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </span>
        </div>

        {/* Expanded output */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3 border-t border-[rgba(255,255,255,0.06)] pt-3">
                <div className="flex items-start justify-between gap-3">
                  <pre className="text-[11px] text-[rgba(255,255,255,0.6)] leading-relaxed whitespace-pre-wrap break-words flex-1 font-mono">
                    {item.output
                      ? item.output.slice(0, 300) + (item.output.length > 300 ? '…' : '')
                      : <span className="text-[rgba(255,255,255,0.25)] italic">No output recorded</span>}
                  </pre>
                  {item.output && (
                    <button
                      onClick={handleCopy}
                      aria-label="Copy output"
                      className="flex-shrink-0 p-1.5 rounded-md text-[rgba(255,255,255,0.3)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                      title="Copy output"
                    >
                      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ── Stats sidebar ─────────────────────────────────────────────────────────────

function StatsSidebar({ items }: { items: ActivityItem[] }) {
  const total = items.length

  const toolCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const item of items) {
      counts[item.toolId] = (counts[item.toolId] ?? 0) + 1
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
  }, [items])

  const platformBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const item of items) {
      counts[item.source] = (counts[item.source] ?? 0) + 1
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([source, count]) => ({
        source,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
        label: SOURCE_LABELS[source]?.label ?? source,
        color: SOURCE_LABELS[source]?.color ?? '#888',
      }))
  }, [items, total])

  return (
    <aside className="hidden xl:block w-64 flex-shrink-0 space-y-4">
      {/* Total runs */}
      <div className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
        <p className="text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)] mb-1">Total Runs</p>
        <p className="text-3xl font-bold text-white tabular-nums">{total.toLocaleString()}</p>
      </div>

      {/* Top tools */}
      {toolCounts.length > 0 && (
        <div className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)] mb-3">Top Tools</p>
          <div className="space-y-2.5">
            {toolCounts.map(([toolId, count], i) => (
              <div key={toolId} className="flex items-center gap-2">
                <span className="text-[10px] text-[rgba(255,255,255,0.25)] w-4 tabular-nums">{i + 1}.</span>
                <span className="text-xs text-[rgba(255,255,255,0.7)] flex-1 truncate">{toTitleCase(toolId)}</span>
                <span className="text-[10px] text-[rgba(255,255,255,0.35)] tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Platform breakdown */}
      {platformBreakdown.length > 0 && (
        <div className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)] mb-3">Platforms</p>
          <div className="space-y-3">
            {platformBreakdown.map(({ source, label, count, pct, color }) => (
              <div key={source}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs" style={{ color }}>{label}</span>
                  <span className="text-[10px] text-[rgba(255,255,255,0.35)] tabular-nums">{pct}%</span>
                </div>
                <ProgressBar value={pct} color={color} />
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const [platform, setPlatform] = useState('all')
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useActivity({
    platform: platform === 'all' ? undefined : platform,
  })

  const allItems = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data])

  const grouped = useMemo(() => groupByDate(allItems), [allItems])

  if (error) {
    return (
      <div className="p-6 max-w-[1100px] mx-auto">
        <ErrorAlert message={error.message} title="Failed to load activity" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-6">
        <Activity size={18} className="text-[#F5A623]" />
        <h1 className="text-lg font-semibold text-white">Activity Feed</h1>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        {FILTER_PILLS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPlatform(key)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full font-medium transition-colors',
              platform === key
                ? 'bg-[#F5A623] text-black'
                : 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.10)] hover:text-[rgba(255,255,255,0.8)]',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Main layout */}
      <div className="flex gap-6 items-start">
        {/* Feed */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 rounded-xl bg-[rgba(255,255,255,0.03)] animate-pulse border border-[rgba(255,255,255,0.06)]"
                />
              ))}
            </div>
          ) : allItems.length === 0 ? (
            <EmptyState
              illustration="history"
              title="No activity yet"
              description="Tool runs will appear here once you start using FluxDesk."
            />
          ) : (
            <div className="space-y-6">
              {grouped.map(({ label, items }) => (
                <section key={label}>
                  <p className="text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)] mb-2 px-1">
                    {label}
                  </p>
                  <div className="space-y-1.5">
                    {items.map((item, i) => (
                      <ActivityRow key={item.id} item={item} index={i} />
                    ))}
                  </div>
                </section>
              ))}

              {/* Load more */}
              {hasNextPage && (
                <div className="pt-2 flex justify-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={isFetchingNextPage}
                    onClick={() => fetchNextPage()}
                  >
                    Load more
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats sidebar */}
        <StatsSidebar items={allItems} />
      </div>
    </div>
  )
}
