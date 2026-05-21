import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/errors'
import toast from 'react-hot-toast'

export interface UserMemory {
  id: string
  userId: string
  frameworkAffinities: Record<string, number>
  providerAffinities: Record<string, number>
  toolFrequency: Record<string, number>
  inferredStack: string[]
  inferredRole?: string
  inferredDomain?: string
  writingStyle?: string
  outputLength?: string
  topTools: string[]
  memoryNotes: string[]
  notes: string[] // legacy alias for memoryNotes — kept for SettingsPage compatibility
  updatedAt: string
}

export interface DashboardStats {
  totalUsage: number
  todayUsage: number
  totalPrompts: number
  activeProvider?: string
  topTools: Array<{ toolId: string; count: number }>
  recentUsage: Array<{
    id: string
    toolId: string
    provider: string
    durationMs: number
    createdAt: string
  }>
}

export function useMemory() {
  return useQuery({
    queryKey: ['memory'],
    queryFn: async () => {
      const { data } = await api.get('/memory')
      return data as UserMemory
    },
    staleTime: 60_000,
  })
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await api.get('/memory/stats')
      return data as DashboardStats
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

type MemoryUpdatePayload = Partial<Pick<UserMemory, 'inferredRole' | 'inferredDomain' | 'writingStyle' | 'outputLength'>>

export function useUpdateMemory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: MemoryUpdatePayload) => {
      await api.patch('/memory', payload)
    },
    onMutate: async (payload) => {
      // Cancel any in-flight refetches so they don't overwrite the optimistic value
      await qc.cancelQueries({ queryKey: ['memory'] })
      const previous = qc.getQueryData<UserMemory>(['memory'])
      // Apply optimistic update immediately — no visible revert during network round-trip
      qc.setQueryData<UserMemory>(['memory'], (old) => (old ? { ...old, ...payload } : old))
      return { previous }
    },
    onError: (error: unknown, _payload, context) => {
      // Roll back to the snapshot taken in onMutate
      if (context?.previous) qc.setQueryData(['memory'], context.previous)
      const m = getErrorMessage(error, 'Could not save. Click retry.')
      if (m) toast.error(m)
    },
    onSettled: () => {
      // Sync with server after success or error
      qc.invalidateQueries({ queryKey: ['memory'] })
    },
  })
}

export function useClearMemory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.delete('/memory')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memory'] })
      toast.success('Memory cleared')
    },
    onError: (error: unknown) => {
      const m = getErrorMessage(error, 'Could not clear memory.')
      if (m) toast.error(m)
    },
  })
}
