import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/errors'
import { useUIStore } from '@/store/uiStore'
import toast from 'react-hot-toast'

export function useRunTool(toolId: string) {
  const addRecentTool = useUIStore((s) => s.addRecentTool)
  const activeProvider = useUIStore((s) => s.activeProvider)

  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const { data } = await api.post(`/tools/${toolId}/run`, {
        ...input,
        preferredProvider: activeProvider,
      })
      return data as { output: string; usageId: string; provider: string; durationMs: number }
    },
    onSuccess: () => {
      addRecentTool(toolId)
    },
    onError: (error: unknown) => {
      const m = getErrorMessage(error, 'This tool could not be run. Try again or check your API keys in Settings.')
      if (m) toast.error(m)
    },
  })
}

export function useRateTool() {
  return useMutation({
    mutationFn: async ({ usageId, rating }: { usageId: string; rating: number }) => {
      await api.post(`/tools/usage/${usageId}/rate`, { rating })
    },
    onError: (error: unknown) => {
      const m = getErrorMessage(error, 'Could not save your feedback.')
      if (m) toast.error(m)
    },
  })
}

export function useToolHistory(toolId: string) {
  return useQuery({
    queryKey: ['tool-history', toolId],
    queryFn: async () => {
      const { data } = await api.get(`/tools/${toolId}/history`)
      return data as Array<{
        id: string
        input: Record<string, unknown>
        output: string
        provider: string
        durationMs: number
        rating?: number
        createdAt: string
      }>
    },
    staleTime: 30_000,
  })
}

export function useAllTools() {
  return useQuery({
    queryKey: ['tools'],
    queryFn: async () => {
      const { data } = await api.get('/tools')
      return data as Array<{ id: string; name: string; description: string }>
    },
    staleTime: Infinity,
  })
}
