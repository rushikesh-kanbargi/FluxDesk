'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Folder } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, Button, ErrorAlert, cn } from '@/components/ui'
import { useProjects, useCreateProject } from '@/hooks/useProjects'
import { useUIStore } from '@/store/uiStore'
import toast from 'react-hot-toast'

const PRESET_COLORS = [
  '#F5A623', '#34d399', '#38bdf8', '#a78bfa',
  '#fb923c', '#f472b6', '#e879f9', '#22d3ee',
]

function NewProjectModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (name: string, color: string, description?: string) => void
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#F5A623')
  const [description, setDescription] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md mx-4 rounded-xl bg-[#1a1a1c] border border-[rgba(255,255,255,0.08)] p-6 shadow-2xl"
      >
        <h2 className="text-sm font-semibold text-white mb-4">New Project</h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-[rgba(255,255,255,0.5)] mb-1.5 block">Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) onCreate(name.trim(), color, description || undefined)
                if (e.key === 'Escape') onClose()
              }}
              placeholder="My project…"
              className="w-full h-9 px-3 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-sm text-white placeholder:text-[rgba(255,255,255,0.3)] focus:outline-none focus:border-[rgba(245,166,35,0.4)]"
            />
          </div>

          <div>
            <label className="text-xs text-[rgba(255,255,255,0.5)] mb-1.5 block">Colour</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-6 h-6 rounded-full border-2 transition-transform hover:scale-110',
                    color === c ? 'border-white scale-110' : 'border-transparent',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-[rgba(255,255,255,0.5)] mb-1.5 block">
              Description <span className="opacity-50">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What is this project about?"
              className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-sm text-white placeholder:text-[rgba(255,255,255,0.3)] focus:outline-none focus:border-[rgba(245,166,35,0.4)] resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            disabled={!name.trim()}
            onClick={() => onCreate(name.trim(), color, description || undefined)}
          >
            Create
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

export default function ProjectsPage() {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const { data: projects, isLoading, error } = useProjects()
  const createProject = useCreateProject()
  const setActiveProjectId = useUIStore((s) => s.setActiveProjectId)

  async function handleCreate(name: string, color: string, description?: string) {
    try {
      const { project } = await createProject.mutateAsync({ name, color, description })
      setShowModal(false)
      toast.success(`"${project.name}" created`)
      router.push(`/projects/${project.id}`)
    } catch {
      toast.error('Failed to create project')
    }
  }

  if (error) return <ErrorAlert message="Failed to load projects" />

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-white">Projects</h1>
          <p className="text-xs text-[rgba(255,255,255,0.4)] mt-0.5">
            Organise your tool runs, flows, and saved prompts
          </p>
        </div>
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus size={13} />
          New Project
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 rounded-xl bg-[rgba(255,255,255,0.03)] animate-pulse border border-[rgba(255,255,255,0.06)]" />
          ))}
        </div>
      ) : projects?.length === 0 ? (
        <div className="text-center py-16">
          <Folder size={32} className="mx-auto mb-3 text-[rgba(255,255,255,0.15)]" />
          <p className="text-sm text-[rgba(255,255,255,0.4)]">No projects yet</p>
          <p className="text-xs text-[rgba(255,255,255,0.25)] mt-1">
            Create a project to organise your work
          </p>
          <Button size="sm" className="mt-4" onClick={() => setShowModal(true)}>
            <Plus size={13} />
            New Project
          </Button>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
        >
          {projects?.map((project) => (
            <motion.div
              key={project.id}
              variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
            >
              <Card
                padding="md"
                className="cursor-pointer hover:border-[rgba(255,255,255,0.12)] transition-colors group"
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="text-sm font-medium text-white truncate">{project.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveProjectId(project.id)
                      toast.success(`"${project.name}" set as active project`)
                    }}
                    className="opacity-0 group-hover:opacity-100 text-[10px] px-2 py-0.5 rounded-full border border-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.4)] hover:text-white hover:border-[rgba(255,255,255,0.3)] transition-all"
                  >
                    Set active
                  </button>
                </div>

                {project.description && (
                  <p className="text-xs text-[rgba(255,255,255,0.4)] mb-3 line-clamp-2">
                    {project.description}
                  </p>
                )}

                <div className="flex gap-4 text-xs text-[rgba(255,255,255,0.3)]">
                  <span>{project._count?.toolUsages ?? 0} runs</span>
                  <span>0 flows</span>
                  <span>{project._count?.prompts ?? 0} prompts</span>
                </div>
              </Card>
            </motion.div>
          ))}

          {/* New project dashed card */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
          >
            <button
              onClick={() => setShowModal(true)}
              className="w-full h-full min-h-[120px] rounded-xl border border-dashed border-[rgba(255,255,255,0.1)] flex flex-col items-center justify-center gap-2 text-xs text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.6)] hover:border-[rgba(255,255,255,0.2)] transition-colors"
            >
              <Plus size={16} />
              New Project
            </button>
          </motion.div>
        </motion.div>
      )}

      {showModal && (
        <NewProjectModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
