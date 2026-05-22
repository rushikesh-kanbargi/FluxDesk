import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'

export interface InsightsData {
  totalRuns: number
  runsThisWeek: number
  runsThisMonth: number
  runsPrevMonth: number
  topTools: Array<{ toolId: string; toolName: string; count: number; lastUsed: string | null }>
  dailyActivity: Array<{ date: string; count: number }>
  providerBreakdown: Array<{ provider: string; count: number; percentage: number }>
  averageRunsPerDay: number
  mostActiveDay: string
  streakDays: number
}

export function useInsights() {
  return useQuery<InsightsData>({
    queryKey: ['insights'],
    queryFn: () => apiGet<InsightsData>('/insights'),
    staleTime: 5 * 60_000, // 5 minutes
  })
}
