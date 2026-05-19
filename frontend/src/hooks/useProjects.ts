import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUIStore } from '@/store/uiStore'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api'

export interface Project {
  id: string
  name: string
  color: string
  description?: string | null
  createdAt: string
  updatedAt: string
  _count?: { toolUsages: number; prompts: number }
}

export interface ProjectDetail extends Project {
  toolUsages: Array<{
    id: string
    toolId: string
    source: string
    createdAt: string
    provider: string | null
    durationMs: number | null
  }>
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () =>
      apiGet<{ projects: Project[] }>('/projects').then((d) => d.projects),
    staleTime: 60_000,
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () =>
      apiGet<{ project: ProjectDetail }>(`/projects/${id}`).then((d) => d.project),
    enabled: !!id,
    staleTime: 60_000,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; color?: string; description?: string }) =>
      apiPost<{ project: Project }>('/projects', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: { name?: string; color?: string; description?: string }
    }) => apiPatch<{ project: Project }>(`/projects/${id}`, data),
    onSuccess: (_r, { id }) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['projects', id] })
    },
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/projects/${id}`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      const { activeProjectId, setActiveProjectId } = useUIStore.getState()
      if (activeProjectId === id) {
        setActiveProjectId(null)
      }
    },
  })
}
