import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/errors'
import toast from 'react-hot-toast'

export interface Prompt {
  id: string
  title: string
  body: string
  framework?: string
  tags: string[]
  starred: boolean
  usageCount: number
  toolId?: string
  provider?: string
  createdAt: string
  updatedAt: string
}

interface PromptsFilter {
  search?: string
  tag?: string
  starred?: boolean
  page?: number
}

export function usePrompts(filter: PromptsFilter = {}) {
  return useQuery({
    queryKey: ['prompts', filter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filter.search)  params.set('search', filter.search)
      if (filter.tag)     params.set('tag', filter.tag)
      if (filter.starred) params.set('starred', 'true')
      if (filter.page)    params.set('page', String(filter.page))
      const { data } = await api.get(`/prompts?${params}`)
      return data as { prompts: Prompt[]; total: number; page: number; pages: number }
    },
    staleTime: 10_000,
  })
}

export function useSavePrompt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { title: string; body: string; tags?: string[]; framework?: string; toolId?: string; provider?: string }) => {
      const { data } = await api.post('/prompts', payload)
      return data as Prompt
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prompts'] })
      toast.success('Saved to library')
    },
    onError: (error: unknown) => {
      const m = getErrorMessage(error, 'Could not save this prompt to the library.')
      if (m) toast.error(m)
    },
  })
}

export function useUpdatePrompt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Prompt> & { id: string }) => {
      const { data } = await api.patch(`/prompts/${id}`, payload)
      return data as Prompt
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prompts'] })
    },
    onError: (error: unknown) => {
      const m = getErrorMessage(error, 'Could not update the prompt.')
      if (m) toast.error(m)
    },
  })
}

export function useDeletePrompt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/prompts/${id}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prompts'] })
      toast.success('Deleted')
    },
    onError: (error: unknown) => {
      const m = getErrorMessage(error, 'Could not delete this prompt.')
      if (m) toast.error(m)
    },
  })
}

export function useToggleStar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/prompts/${id}/star`)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prompts'] })
    },
    onError: (error: unknown) => {
      const m = getErrorMessage(error, 'Could not update the star on this prompt.')
      if (m) toast.error(m)
    },
  })
}

export function usePromptTags() {
  return useQuery({
    queryKey: ['prompt-tags'],
    queryFn: async () => {
      const { data } = await api.get('/prompts/tags')
      return data as string[]
    },
    staleTime: 30_000,
  })
}
