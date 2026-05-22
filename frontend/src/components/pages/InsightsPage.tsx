'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import { BarChart2, Flame, TrendingUp, TrendingDown, Calendar, Zap, Share2, Loader2 } from 'lucide-react'
import { formatDistanceToNow, format, parseISO } from 'date-fns'
import Link from 'next/link'
import { useInsights } from '@/hooks/useInsights'
import { cn, Button, Skeleton, ErrorAlert } from '@/components/ui'

// ── Count-up hook ─────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (target === 0) { setValue(0); return }
    const start = performance.now()
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(tick)
    }
    const raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

// ── Trend badge ───────────────────────────────────────────────────────────────

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null
  const pct = Math.round(((current - previous) / previous) * 100)
  const isUp = pct >= 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded',
        isUp
          ? 'text-emerald bg-[rgba(52,211,153,0.12)]'
          : 'text-rose bg-[rgba(244,63,94,0.12)]',
      )}
    >
      {isUp ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
      {isUp ? '+' : ''}{pct}%
    </span>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: number | string
  sub?: React.ReactNode
  icon?: React.ReactNode
  index?: number
}

function StatCard({ label, sub, icon, index = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 280, damping: 28 }}
      className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 flex flex-col gap-2"
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)]">{label}</p>
        {icon && (
          <span className="text-[rgba(255,255,255,0.2)]">{icon}</span>
        )}
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1 min-w-0">{sub}</div>
      </div>
    </motion.div>
  )
}

// ── Total runs card ───────────────────────────────────────────────────────────

function TotalRunsCard({ total, index }: { total: number; index: number }) {
  const display = useCountUp(total)
  return (
    <StatCard
      label="Total Runs"
      value={total}
      index={index}
      icon={<Zap size={13} />}
      sub={
        <div className="space-y-1">
          <p className="text-3xl font-bold text-white tabular-nums">{display.toLocaleString()}</p>
          <p className="text-[10px] text-[rgba(255,255,255,0.3)]">All time</p>
        </div>
      }
    />
  )
}

// ── This month card ───────────────────────────────────────────────────────────

function ThisMonthCard({
  runsThisMonth,
  runsPrevMonth,
  index,
}: {
  runsThisMonth: number
  runsPrevMonth: number
  index: number
}) {
  const display = useCountUp(runsThisMonth)
  return (
    <StatCard
      label="This Month"
      value={runsThisMonth}
      index={index}
      icon={<Calendar size={13} />}
      sub={
        <div className="space-y-1">
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-white tabular-nums">{display.toLocaleString()}</p>
            <div className="pb-1">
              <TrendBadge current={runsThisMonth} previous={runsPrevMonth} />
            </div>
          </div>
          <p className="text-[10px] text-[rgba(255,255,255,0.3)]">
            vs {runsPrevMonth.toLocaleString()} last month
          </p>
        </div>
      }
    />
  )
}

// ── Streak card ───────────────────────────────────────────────────────────────

function StreakCard({ streakDays, index }: { streakDays: number; index: number }) {
  const display = useCountUp(streakDays)
  return (
    <StatCard
      label="Day Streak"
      value={streakDays}
      index={index}
      icon={streakDays > 2 ? <Flame size={13} className="text-[#F5A623]" /> : undefined}
      sub={
        <div className="space-y-1">
          <div className="flex items-end gap-1.5">
            <p className="text-3xl font-bold text-white tabular-nums">{display}</p>
            {streakDays > 2 && <span className="pb-1 text-base">🔥</span>}
          </div>
          <p className="text-[10px] text-[rgba(255,255,255,0.3)]">consecutive days</p>
        </div>
      }
    />
  )
}

// ── Most active card ──────────────────────────────────────────────────────────

function MostActiveCard({ mostActiveDay, index }: { mostActiveDay: string; index: number }) {
  return (
    <StatCard
      label="Most Active"
      value={0}
      index={index}
      icon={<TrendingUp size={13} />}
      sub={
        <div className="space-y-1">
          <p className="text-2xl font-bold text-white truncate">{mostActiveDay || '—'}</p>
          <p className="text-[10px] text-[rgba(255,255,255,0.3)]">best day of week</p>
        </div>
      }
    />
  )
}

// ── Custom recharts tooltip ───────────────────────────────────────────────────

interface RechartsTooltipPayload {
  value?: number | string
  name?: string
}

interface ChartTooltipProps {
  active?: boolean
  payload?: RechartsTooltipPayload[]
  label?: string
}

function ActivityTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1c1c1c] border border-[rgba(255,255,255,0.10)] rounded-lg px-3 py-2 text-xs shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
      <p className="text-[rgba(255,255,255,0.5)] mb-0.5">{label}</p>
      <p className="text-white font-medium">{payload[0].value} runs</p>
    </div>
  )
}

function BarTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1c1c1c] border border-[rgba(255,255,255,0.10)] rounded-lg px-3 py-2 text-xs shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
      <p className="text-[rgba(255,255,255,0.5)] mb-0.5">{label}</p>
      <p className="text-white font-medium">{payload[0].value} runs</p>
    </div>
  )
}

// ── Provider colors ───────────────────────────────────────────────────────────

const PROVIDER_COLORS: Record<string, string> = {
  claude:  '#f0abfc',
  anthropic: '#f0abfc',
  openai:  '#6ee7b7',
  gemini:  '#7dd3fc',
  google:  '#7dd3fc',
  groq:    '#fbbf24',
}

function providerColor(name: string): string {
  const key = name.toLowerCase()
  for (const [k, c] of Object.entries(PROVIDER_COLORS)) {
    if (key.includes(k)) return c
  }
  // deterministic fallback from the palette
  const fallbacks = ['#f0abfc', '#6ee7b7', '#7dd3fc', '#fbbf24', '#a78bfa', '#fb923c']
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff
  return fallbacks[Math.abs(hash) % fallbacks.length]
}

// ── Daily activity chart ──────────────────────────────────────────────────────

function DailyActivityChart({ data }: { data: Array<{ date: string; count: number }> }) {
  const formatted = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        label: (() => {
          try {
            return format(parseISO(d.date), 'MMM d')
          } catch {
            return d.date
          }
        })(),
      })),
    [data],
  )

  return (
    <div className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)] mb-4">
        Daily Activity
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={formatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F5A623" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#F5A623" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="0"
          />
          <XAxis
            dataKey="label"
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'inherit' }}
            axisLine={false}
            tickLine={false}
            interval={Math.floor(formatted.length / 6)}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'inherit' }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <RechartsTooltip
            content={<ActivityTooltip />}
            cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#F5A623"
            strokeWidth={1.5}
            fill="url(#areaFill)"
            dot={false}
            activeDot={{ r: 3, fill: '#F5A623', stroke: '#09090b', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Provider breakdown chart ──────────────────────────────────────────────────

function ProviderBreakdownChart({
  data,
}: {
  data: Array<{ provider: string; count: number; percentage: number }>
}) {
  const colored = useMemo(
    () => data.map((d) => ({ ...d, color: providerColor(d.provider) })),
    [data],
  )

  return (
    <div className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)] mb-4">
        Provider Breakdown
      </p>
      {data.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center">
          <p className="text-xs text-[rgba(255,255,255,0.2)]">No data</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={Math.max(data.length * 42, 120)}>
            <BarChart
              data={colored}
              layout="vertical"
              margin={{ top: 0, right: 48, left: 0, bottom: 0 }}
              barSize={12}
            >
              <XAxis
                type="number"
                hide
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="provider"
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'inherit' }}
                axisLine={false}
                tickLine={false}
                width={64}
              />
              <RechartsTooltip
                content={<BarTooltip />}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                {colored.map((entry, i) => (
                  <Cell key={i} fill={entry.color} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Percentage labels */}
          <div className="mt-2 space-y-1">
            {colored.map((d) => (
              <div key={d.provider} className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: d.color }}>{d.provider}</span>
                <span className="text-[10px] text-[rgba(255,255,255,0.3)] tabular-nums">{d.percentage}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Top tools table ───────────────────────────────────────────────────────────

function toTitleCase(str: string) {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

function relativeTime(iso: string | null) {
  if (!iso) return '—'
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true })
  } catch {
    return '—'
  }
}

function TopToolsTable({
  tools,
}: {
  tools: Array<{ toolId: string; toolName: string; count: number; lastUsed: string | null }>
}) {
  const maxCount = tools[0]?.count ?? 1

  return (
    <div className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
        <p className="text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)]">
          Top Tools
        </p>
      </div>
      {tools.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-xs text-[rgba(255,255,255,0.2)]">No tool runs recorded</p>
        </div>
      ) : (
        <div className="divide-y divide-[rgba(255,255,255,0.04)]">
          {/* Header */}
          <div className="grid grid-cols-[28px_1fr_80px_120px_140px] gap-3 px-4 py-2">
            <span className="text-[10px] text-[rgba(255,255,255,0.25)]">#</span>
            <span className="text-[10px] text-[rgba(255,255,255,0.25)]">Tool</span>
            <span className="text-[10px] text-[rgba(255,255,255,0.25)] text-right">Runs</span>
            <span className="text-[10px] text-[rgba(255,255,255,0.25)] text-right">Last Used</span>
            <span className="text-[10px] text-[rgba(255,255,255,0.25)]">Relative</span>
          </div>
          {tools.map((tool, i) => (
            <motion.div
              key={tool.toolId}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, type: 'spring', stiffness: 280, damping: 28 }}
              className="grid grid-cols-[28px_1fr_80px_120px_140px] gap-3 px-4 py-3 items-center hover:bg-[rgba(255,255,255,0.02)] transition-colors"
            >
              <span className="text-[10px] text-[rgba(255,255,255,0.25)] tabular-nums">{i + 1}.</span>
              <span className="text-xs text-white truncate font-medium">
                {tool.toolName || toTitleCase(tool.toolId)}
              </span>
              <span className="text-xs text-[rgba(255,255,255,0.6)] tabular-nums text-right">
                {tool.count.toLocaleString()}
              </span>
              <span className="text-[10px] text-[rgba(255,255,255,0.3)] text-right">
                {relativeTime(tool.lastUsed)}
              </span>
              <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(tool.count / maxCount) * 100}%` }}
                  transition={{ delay: i * 0.04 + 0.1, type: 'spring', stiffness: 100, damping: 20 }}
                  className="h-full rounded-full bg-[rgba(245,166,35,0.6)]"
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Skeleton loading ──────────────────────────────────────────────────────────

function InsightsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 space-y-3"
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-[200px] w-full" />
        </div>
        <div className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 space-y-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
      {/* Table */}
      <div className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
          <Skeleton className="h-3 w-16" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-4 border-b border-[rgba(255,255,255,0.04)]">
            <Skeleton className="h-3 w-4" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-1.5 w-28" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function InsightsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
      <div className="text-4xl">📊</div>
      <h3 className="text-white font-medium">No data yet</h3>
      <p className="text-[rgba(255,255,255,0.5)] text-sm max-w-xs">
        Run a few tools and your insights will appear here.
      </p>
      <Link href="/dashboard">
        <Button variant="primary">Go to tools</Button>
      </Link>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const { data, isLoading, error } = useInsights()
  const [downloading, setDownloading] = useState(false)

  async function handleShare() {
    if (!data) return
    setDownloading(true)
    try {
      const params = new URLSearchParams({
        total:    String(data.totalRuns),
        month:    String(data.runsThisMonth),
        streak:   String(data.streakDays),
        topTool:  data.topTools[0]?.toolName ?? '—',
        topCount: String(data.topTools[0]?.count ?? 0),
        provider: data.providerBreakdown[0]?.provider ?? '—',
      })
      const res = await fetch(`/api/og/insights?${params.toString()}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'fluxdesk-stats.png'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  if (error) {
    return (
      <div className="p-6 max-w-[1100px] mx-auto">
        <ErrorAlert message={error.message} title="Failed to load insights" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-6">
        <BarChart2 size={18} className="text-[#F5A623]" />
        <h1 className="text-lg font-semibold text-white">Usage Insights</h1>
        {data && data.totalRuns >= 5 && (
          <button
            onClick={handleShare}
            disabled={downloading}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.09)] text-[rgba(255,255,255,0.6)] hover:text-white border border-[rgba(255,255,255,0.08)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Share2 size={12} />
            )}
            {downloading ? 'Generating…' : 'Share stats'}
          </button>
        )}
      </div>

      {isLoading ? (
        <InsightsSkeleton />
      ) : !data || data.totalRuns < 5 ? (
        <InsightsEmptyState />
      ) : (
        <div className="space-y-6">
          {/* Row 1 — Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <TotalRunsCard total={data.totalRuns} index={0} />
            <ThisMonthCard
              runsThisMonth={data.runsThisMonth}
              runsPrevMonth={data.runsPrevMonth}
              index={1}
            />
            <StreakCard streakDays={data.streakDays} index={2} />
            <MostActiveCard mostActiveDay={data.mostActiveDay} index={3} />
          </div>

          {/* Row 2 — Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <DailyActivityChart data={data.dailyActivity} />
            </div>
            <div>
              <ProviderBreakdownChart data={data.providerBreakdown} />
            </div>
          </div>

          {/* Row 3 — Top tools */}
          <TopToolsTable tools={data.topTools} />
        </div>
      )}
    </div>
  )
}
