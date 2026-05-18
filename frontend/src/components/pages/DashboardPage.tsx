'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Zap, Sparkles, GitPullRequest, Bug, GitCommit, FileText,
  ClipboardList, Users, Layers, BookOpen, CreditCard, BarChart2,
  Video, MessageSquare, AlertTriangle, EyeOff, TrendingUp,
  ArrowRightLeft, Mail, Brain, MessageCircle,
  BookMarked, Clock, ChevronRight, Cpu, Globe, type LucideIcon,
} from 'lucide-react'
import { Button, Card, Badge, Skeleton, AnimatedCounter, ProgressBar, ErrorAlert, cn } from '@/components/ui'
import { getErrorMessage } from '@/lib/errors'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { useDashboardStats, useMemory } from '@/hooks/useMemory'
import { TOOL_CONFIGS, TOOL_CATEGORIES, ALL_TOOLS } from '@/components/tools/configs'
import { AI_PROVIDERS, type AIProvider } from '@/types'
import { formatDistanceToNow } from 'date-fns'

// ── Icon map ───────────────────────────────────────────────────
const ICON_MAP: Record<string, LucideIcon> = {
  Zap, Sparkles, GitPullRequest, Bug, GitCommit, FileText,
  ClipboardList, Users, Layers, BookOpen, CreditCard, BarChart2,
  Video, MessageSquare, AlertTriangle, EyeOff, TrendingUp,
  ArrowRightLeft, Mail, Brain, MessageCircle,
}

function getGreeting(name: string) {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  return `Good ${part}, ${name}`
}

// ── Stagger variants ───────────────────────────────────────────
const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.03 },
  },
}

const item = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } },
}

// ── Dashboard ──────────────────────────────────────────────────
export default function DashboardPage() {
  const user            = useAuthStore((s) => s.user)
  const activeProvider  = useUIStore((s) => s.activeProvider)
  const recentTools     = useUIStore((s) => s.recentTools)

  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    error: statsQueryError,
    refetch: refetchStats,
  } = useDashboardStats()
  const {
    data: memory,
    isLoading: memoryLoading,
    isError: memoryError,
    error: memoryQueryError,
    refetch: refetchMemory,
  } = useMemory()

  const greeting    = getGreeting(user?.user_metadata?.name || user?.email?.split('@')[0] || 'there')
  const providerInfo = AI_PROVIDERS[activeProvider as AIProvider]

  // Recent tool configs (last 3)
  const recentToolConfigs = useMemo(() => {
    return recentTools
      .map((id) => TOOL_CONFIGS[id])
      .filter(Boolean)
      .slice(0, 3)
  }, [recentTools])

  // Framework affinities sorted desc
  const topFrameworks = useMemo(() => {
    if (!memory?.frameworkAffinities) return []
    return Object.entries(memory.frameworkAffinities)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
  }, [memory])

  const maxFrameworkScore = topFrameworks[0]?.[1] || 1

  // Max usage for progress bar scaling
  const maxUsage = useMemo(
    () => Math.max(...(stats?.topTools?.map((t) => t.count) ?? [1]), 1),
    [stats],
  )

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-[1400px] mx-auto px-5 py-6">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-xl font-semibold text-ink tracking-tight">{greeting}</h1>
          <p className="text-sm text-ink-dim mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </motion.div>

        {(statsError || memoryError) && (
          <div className="mb-4 space-y-2">
            {statsError && (
              <ErrorAlert
                title="Could not load usage stats"
                message={getErrorMessage(statsQueryError, 'Request failed.')}
                onRetry={() => void refetchStats()}
              />
            )}
            {memoryError && (
              <ErrorAlert
                title="Could not load your memory profile"
                message={getErrorMessage(memoryQueryError, 'Request failed.')}
                onRetry={() => void refetchMemory()}
              />
            )}
          </div>
        )}

        <div className="flex gap-5 xl:flex-row flex-col">

          {/* ── Main column ── */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* Stat cards */}
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 lg:grid-cols-4 gap-3"
            >
              <StatCard
                label="Prompts Generated"
                value={stats?.totalUsage ?? 0}
                loading={statsLoading}
                icon={<Zap size={14} className="text-amber" />}
                color="amber"
              />
              <StatCard
                label="Used Today"
                value={stats?.todayUsage ?? 0}
                loading={statsLoading}
                icon={<Clock size={14} className="text-sky" />}
                color="sky"
              />
              <StatCard
                label="Saved Prompts"
                value={stats?.totalPrompts ?? 0}
                loading={statsLoading}
                icon={<BookMarked size={14} className="text-violet" />}
                color="violet"
              />
              <StatCard
                label="Active AI"
                value={providerInfo.label}
                loading={false}
                icon={<Cpu size={14} style={{ color: providerInfo.color }} />}
                color="custom"
                customColor={providerInfo.color}
                isString
              />
            </motion.div>

            {/* Continue where you left off */}
            {recentToolConfigs.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <SectionHeader title="Continue where you left off" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {recentToolConfigs.map((config) => {
                    const Icon = ICON_MAP[config.icon] ?? Zap
                    const cat  = TOOL_CATEGORIES[config.category as keyof typeof TOOL_CATEGORIES]
                    return (
                      <motion.div key={config.id} variants={item}>
                        <Link href={`/tools/${config.id}`}>
                          <div className={cn(
                            'group p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111113]',
                            'hover:border-[rgba(255,255,255,0.12)] hover:bg-[#18181b]',
                            'transition-all duration-150 cursor-pointer',
                          )}>
                            <div className="flex items-start gap-3">
                              <div
                                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: cat.bgColor, border: `1px solid ${cat.borderColor}` }}
                              >
                                <Icon size={14} style={{ color: cat.color }} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-ink truncate">{config.name}</p>
                                <p className="text-xs text-ink-dim mt-0.5 line-clamp-2">{config.description}</p>
                              </div>
                              <ChevronRight
                                size={13}
                                className="text-ink-dim opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5"
                              />
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.section>
            )}

            {/* All Tools — grouped by category */}
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="flex items-center justify-between mb-3">
                <SectionHeader title="All Tools" className="mb-0" />
                <span className="text-xs text-ink-dim">{ALL_TOOLS.length} tools</span>
              </div>

              {Object.keys(TOOL_CATEGORIES).map((category) => {
                const catTools = ALL_TOOLS.filter((t) => t.category === category)
                const cat      = TOOL_CATEGORIES[category as keyof typeof TOOL_CATEGORIES]
                return (
                  <div key={category} className="mb-5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-xs font-medium text-ink-dim">{category}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {catTools.map((config) => {
                        const Icon       = ICON_MAP[config.icon] ?? Zap
                        const usageCount = stats?.topTools?.find((t) => t.toolId === config.id)?.count ?? 0
                        return (
                          <Link key={config.id} href={`/tools/${config.id}`}>
                            <motion.div
                              whileHover={{ borderColor: 'rgba(255,255,255,0.12)' }}
                              whileTap={{ scale: 0.98 }}
                              className={cn(
                                'group p-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111113]',
                                'transition-colors duration-150 cursor-pointer h-full',
                              )}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <div
                                  className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                                  style={{ backgroundColor: cat.bgColor }}
                                >
                                  <Icon size={11} style={{ color: cat.color }} />
                                </div>
                                <span className="text-xs font-medium text-ink truncate">{config.name}</span>
                              </div>
                              {usageCount > 0 && (
                                <div className="mt-2">
                                  <ProgressBar
                                    value={(usageCount / maxUsage) * 100}
                                    color={cat.color}
                                    className="h-0.5"
                                  />
                                </div>
                              )}
                            </motion.div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </motion.section>
          </div>

          {/* ── Right rail ── */}
          <div className="xl:w-[280px] flex-shrink-0 space-y-4">

            {/* Connected Platforms */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card padding="md">
                <div className="flex items-center gap-2 mb-3">
                  <Globe size={12} className="text-ink-dim" />
                  <span className="text-xs font-semibold text-ink">Connected Platforms</span>
                </div>
                <div className="space-y-2">
                  <PlatformRow label="Web App" status="active" detail="You're here" />
                  <PlatformRow label="VS Code Extension" status="available" detail="5 commands" />
                  <PlatformRow label="Gmail Add-on" status="available" detail="11 tools" />
                  <PlatformRow label="Google Chat Bot" status="available" detail="14 slash commands" />
                </div>
              </Card>
            </motion.div>

            {/* Active AI card */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.12 }}
            >
              <Card padding="md">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: providerInfo.color }}
                  />
                  <span className="text-xs font-semibold text-ink">Active AI</span>
                </div>
                <p className="text-lg font-semibold text-ink">{providerInfo.label}</p>
                <p className="text-xs text-ink-dim mt-1 capitalize">{activeProvider} API</p>
                <Link href="/settings">
                  <Button variant="ghost" size="sm" className="mt-3 w-full text-xs">
                    Switch provider
                  </Button>
                </Link>
              </Card>
            </motion.div>

            {/* Memory Profile */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.16 }}
            >
              <Card padding="md">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-ink">Memory Profile</span>
                  <Badge variant="amber" className="text-[10px]">Learning</Badge>
                </div>

                {memoryLoading ? (
                  <div className="space-y-2.5">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="space-y-1">
                        <Skeleton className="h-2.5 w-20" />
                        <Skeleton className="h-1.5 w-full" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Framework affinities */}
                    {topFrameworks.length > 0 && (
                      <div className="space-y-2 mb-4">
                        <p className="text-[10px] text-ink-dim uppercase tracking-widest font-medium mb-2">
                          Framework Preferences
                        </p>
                        {topFrameworks.map(([framework, score], i) => (
                          <motion.div
                            key={framework}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 + i * 0.05 }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-ink-muted">{framework}</span>
                              <span className="text-[10px] text-ink-dim">
                                {Math.round((score / maxFrameworkScore) * 100)}%
                              </span>
                            </div>
                            <ProgressBar
                              value={(score / maxFrameworkScore) * 100}
                              color="#F5A623"
                              className="h-1"
                            />
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {/* Tech stack tags */}
                    {memory?.inferredStack && memory.inferredStack.length > 0 && (
                      <div>
                        <p className="text-[10px] text-ink-dim uppercase tracking-widest font-medium mb-2">
                          Tech Stack
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {memory.inferredStack.map((tech) => (
                            <Badge key={tech} variant="default" className="text-[10px]">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Role / Domain */}
                    {(memory?.inferredRole || memory?.inferredDomain) && (
                      <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)]">
                        {memory.inferredRole && (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-ink-dim">Role</span>
                            <span className="text-xs text-ink-muted capitalize">{memory.inferredRole}</span>
                          </div>
                        )}
                        {memory.inferredDomain && (
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-ink-dim">Domain</span>
                            <span className="text-xs text-ink-muted capitalize">{memory.inferredDomain}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {!topFrameworks.length && !memory?.inferredStack?.length && (
                      <p className="text-xs text-ink-dim text-center py-3">
                        Run tools to build your profile
                      </p>
                    )}
                  </>
                )}
              </Card>
            </motion.div>

            {/* Recent Activity */}
            {stats?.recentUsage && stats.recentUsage.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card padding="md">
                  <span className="text-xs font-semibold text-ink block mb-3">Recent Activity</span>
                  <div className="space-y-2">
                    {stats.recentUsage.slice(0, 5).map((usage) => {
                      const config = TOOL_CONFIGS[usage.toolId]
                      if (!config) return null
                      return (
                        <Link key={usage.id} href={`/tools/${usage.toolId}`}>
                          <div className="flex items-center gap-2 py-1 hover:bg-[rgba(255,255,255,0.04)] rounded-md px-1 -mx-1 transition-colors">
                            <div className="w-1.5 h-1.5 rounded-full bg-[rgba(255,255,255,0.15)] flex-shrink-0" />
                            <span className="text-xs text-ink-muted truncate flex-1">{config.name}</span>
                            <span className="text-[10px] text-ink-dim flex-shrink-0">
                              {formatDistanceToNow(new Date(usage.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </Card>
              </motion.div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────

interface StatCardProps {
  label:        string
  value:        number | string
  loading:      boolean
  icon:         React.ReactNode
  color:        string
  customColor?: string
  isString?:    boolean
}

function StatCard({ label, value, loading, icon, color, customColor, isString = false }: StatCardProps) {
  return (
    <motion.div variants={item}>
      <Card padding="md" className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-ink-dim">{label}</span>
          {icon}
        </div>
        {loading ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <div className="text-2xl font-semibold text-ink tracking-tight">
            {isString ? (
              <span style={{ color: customColor }}>{value}</span>
            ) : (
              <AnimatedCounter value={value as number} />
            )}
          </div>
        )}
      </Card>
    </motion.div>
  )
}

function SectionHeader({ title, className }: { title: string; className?: string }) {
  return (
    <h2 className={cn('text-xs font-semibold text-ink-dim uppercase tracking-widest mb-3', className)}>
      {title}
    </h2>
  )
}

function PlatformRow({ label, status, detail }: { label: string; status: 'active' | 'available'; detail: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={cn(
        'w-1.5 h-1.5 rounded-full flex-shrink-0',
        status === 'active' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-[rgba(255,255,255,0.2)]',
      )} />
      <span className="text-xs text-ink flex-1 truncate">{label}</span>
      <span className="text-[10px] text-ink-dim flex-shrink-0">{detail}</span>
    </div>
  )
}
