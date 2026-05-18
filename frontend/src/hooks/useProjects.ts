import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

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

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json() as Promise<T>
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () =>
      apiFetch<{ projects: Project[] }>('/api/projects').then((d) => d.projects),
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () =>
      apiFetch<{ project: ProjectDetail }>(`/api/projects/${id}`).then((d) => d.project),
    enabled: !!id,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; color?: string; description?: string }) =>
      apiFetch<{ project: Project }>('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
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
    }) =>
      apiFetch<{ project: Project }>(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: (_r, { id }) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['projects', id] })
    },
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/projects/${id}`, { method: 'DELETE' }).then((r) => {
        if (!r.ok) throw new Error('Delete failed')
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}
