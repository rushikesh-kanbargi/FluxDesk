'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Clock, Zap, BookMarked, GitBranch, Plug } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Card, ErrorAlert, cn } from '@/components/ui'
import { useProject } from '@/hooks/useProjects'

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  WEB:     { label: 'Web',     color: '#38bdf8' },
  VSCODE:  { label: 'VS Code', color: '#a78bfa' },
  GMAIL:   { label: 'Gmail',   color: '#34d399' },
  CHATBOT: { label: 'Chat',    color: '#fb923c' },
  FLOW:    { label: 'Flow',    color: '#F5A623' },
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: project, isLoading, error } = useProject(id)

  if (error) return <ErrorAlert message="Project not found" />

  if (isLoading) {
    return (
      <div className="max-w-[1100px] mx-auto px-6 py-8">
        <div className="h-8 w-48 bg-[rgba(255,255,255,0.05)] animate-pulse rounded mb-6" />
        <div className="grid grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-[rgba(255,255,255,0.03)] animate-pulse rounded-xl border border-[rgba(255,255,255,0.06)]" />
          ))}
        </div>
      </div>
    )
  }

  if (!project) return null

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="text-[rgba(255,255,255,0.4)] hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-2.5">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <h1 className="text-lg font-semibold text-white">{project.name}</h1>
        </div>
        {project.updatedAt && (
          <span className="text-xs text-[rgba(255,255,255,0.3)] ml-auto">
            Updated {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
          </span>
        )}
        <span className="text-xs text-[rgba(255,255,255,0.3)]">No integrations connected</span>
      </div>

      {project.description && (
        <p className="text-sm text-[rgba(255,255,255,0.5)] mb-6">{project.description}</p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Zap,        label: 'Tool Runs',     value: project._count?.toolUsages ?? 0 },
          { icon: GitBranch,  label: 'Active Flows',  value: 0 },
          { icon: BookMarked, label: 'Saved Prompts', value: project._count?.prompts ?? 0 },
          { icon: Plug,       label: 'Integrations',  value: 0 },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label} padding="md">
            <div className="flex items-center gap-2 mb-1">
              <Icon size={13} className="text-[rgba(255,255,255,0.3)]" />
              <span className="text-xs text-[rgba(255,255,255,0.4)]">{label}</span>
            </div>
            <div className="text-2xl font-bold text-white">{value}</div>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">Recent Activity</h2>
        {project.toolUsages.length === 0 ? (
          <div className="text-center py-10 text-xs text-[rgba(255,255,255,0.3)]">
            No tool runs in this project yet
          </div>
        ) : (
          <div className="space-y-1">
            {project.toolUsages.slice(0, 10).map((usage) => {
              const src = SOURCE_LABELS[usage.source] ?? SOURCE_LABELS.WEB
              return (
                <div
                  key={usage.id}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.08)] transition-colors"
                >
                  <span
                    className="text-xs px-1.5 py-0.5 rounded font-medium"
                    style={{ color: src.color, backgroundColor: `${src.color}15` }}
                  >
                    {src.label}
                  </span>
                  <span className="text-xs text-white font-medium">{usage.toolId}</span>
                  {usage.provider && (
                    <span className="text-[10px] text-[rgba(255,255,255,0.3)] ml-auto mr-2">
                      {usage.provider}
                    </span>
                  )}
                  <span className="text-[10px] text-[rgba(255,255,255,0.3)] flex items-center gap-1">
                    <Clock size={10} />
                    {formatDistanceToNow(new Date(usage.createdAt), { addSuffix: true })}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
