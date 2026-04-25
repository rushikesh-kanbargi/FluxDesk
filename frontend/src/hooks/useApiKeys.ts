import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/errors'
import { toApiProviderEnum } from '@/types'
import toast from 'react-hot-toast'

export interface ApiKeyRecord {
  provider: string
  hint: string
  createdAt: string
}

export function useApiKeys() {
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const { data } = await api.get('/keys')
      const list = data as Array<ApiKeyRecord & { provider: string }>
      return list.map((k) => ({ ...k, provider: k.provider.toLowerCase() })) as ApiKeyRecord[]
    },
    staleTime: 60_000,
  })
}

export function useSaveApiKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ provider, key }: { provider: string; key: string }) => {
      await api.post('/keys', { provider: toApiProviderEnum(provider), key })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys'] })
      toast.success('API key saved')
    },
    onError: (error: unknown) => {
      const m = getErrorMessage(
        error,
        'We could not save that API key. Check the key and your connection, then try again.',
      )
      if (m) toast.error(m)
    },
  })
}

export function useDeleteApiKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (provider: string) => {
      await api.delete(`/keys/${encodeURIComponent(toApiProviderEnum(provider))}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys'] })
      toast.success('API key removed')
    },
    onError: (error: unknown) => {
      const m = getErrorMessage(error, 'Could not remove this API key. Try again.')
      if (m) toast.error(m)
    },
  })
}

export function useVerifyApiKey() {
  return useMutation({
    mutationFn: async ({ provider, key }: { provider: string; key: string }) => {
      const { data } = await api.post('/keys/verify', { provider: toApiProviderEnum(provider), key })
      return data as { valid: boolean; latencyMs?: number }
    },
    onError: (error: unknown) => {
      const m = getErrorMessage(
        error,
        'We could not verify that key. Check the key and your network, then try again.',
      )
      if (m) toast.error(m)
    },
  })
}
