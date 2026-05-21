import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'

export interface DemoStatus {
  enabled: boolean
  runsUsed: number
  runsMax: number
  hasOwnKey: boolean
  eligible: boolean
  reason?: string
}

async function fetchDemoStatus(token: string): Promise<DemoStatus> {
  const res = await fetch('/api/demo/status', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch demo status')
  return res.json()
}

export function useDemoStatus() {
  const token = useAuthStore((s) => s.session?.access_token)

  return useQuery<DemoStatus>({
    queryKey: ['demo-status'],
    queryFn: () => fetchDemoStatus(token!),
    enabled: !!token,
    staleTime: 30_000, // 30s — runs used only changes on tool execution
  })
}
