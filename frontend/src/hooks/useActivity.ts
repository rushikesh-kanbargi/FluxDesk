import { useInfiniteQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'

export interface ActivityItem {
  id: string
  toolId: string
  source: string
  projectId: string | null
  provider: string | null
  durationMs: number | null
  rating: number | null
  createdAt: string
  output: string | null
  project: { id: string; name: string; color: string } | null
}

export interface ActivityPage {
  items: ActivityItem[]
  nextCursor: string | null
}

export function useActivity(filters: { platform?: string; projectId?: string } = {}) {
  return useInfiniteQuery<ActivityPage, Error, import('@tanstack/react-query').InfiniteData<ActivityPage>, string[], string | null>({
    queryKey: ['activity', filters.platform ?? 'all', filters.projectId ?? ''],
    initialPageParam: null,
    staleTime: 10_000,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '50' })
      if (filters.platform && filters.platform !== 'all') params.set('platform', filters.platform)
      if (filters.projectId) params.set('projectId', filters.projectId)
      if (pageParam) params.set('cursor', pageParam)

      return apiGet<ActivityPage>(`/activity?${params}`)
    },
    getNextPageParam: (last) => last.nextCursor,
  })
}
