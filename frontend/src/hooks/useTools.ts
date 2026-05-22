import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/errors'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
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

/**
 * Signals that an error originated from a mid-stream SSE error event.
 * Used in the catch block to suppress the toast — the inline banner shows it.
 */
class SseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SseError'
  }
}

/**
 * Streams a tool run over SSE, building up output chunk-by-chunk.
 *
 * Replaces useRunTool for the main ToolPage flow. useRunTool is kept intact
 * for pipeline execution and any other non-streaming callers.
 *
 * Resilience note: if the function times out (Vercel Hobby: 10s, Pro: 60s),
 * the stream closes mid-response and the user sees whatever partial output was
 * received — a genuine UX improvement over the 504 they'd get from /run on the
 * same timeout. This is streaming as graceful degradation, not just eye candy.
 */
export function useStreamTool(toolId: string) {
  const [output, setOutput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [usageId, setUsageId] = useState<string | null>(null)
  const [provider, setProvider] = useState('')
  const [durationMs, setDurationMs] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<number | null>(null)
  const [retryAfterSec, setRetryAfterSec] = useState<number | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [demoRunsUsed, setDemoRunsUsed] = useState(0)
  const addRecentTool = useUIStore((s) => s.addRecentTool)
  const queryClient = useQueryClient()

  const runStream = useCallback(
    async (input: Record<string, unknown>) => {
      setOutput('')
      setIsStreaming(true)
      setUsageId(null)
      setError(null)
      setErrorCode(null)
      setRetryAfterSec(null)
      setFieldErrors(null)
      setProvider('')
      setDurationMs(0)

      const token = useAuthStore.getState().session?.access_token
      if (!token) {
        const msg = 'Not authenticated. Please sign in again.'
        setError(msg)
        setIsStreaming(false)
        toast.error(msg)
        return
      }

      try {
        const response = await fetch(`/api/tools/${toolId}/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(input),
        })

        // Non-2xx before stream starts → JSON error response
        if (!response.ok) {
          const code = response.status
          setErrorCode(code)

          if (code === 429) {
            const retryAfter = response.headers.get('Retry-After')
            setRetryAfterSec(retryAfter ? parseInt(retryAfter, 10) : 60)
          }

          const err = await response.json().catch(() => ({ error: `Request failed (${code})` }))

          if (code === 400 && Array.isArray(err.details)) {
            const parsed: Record<string, string> = {}
            for (const d of err.details as Array<{ field: string; message: string }>) {
              parsed[d.field] = d.message
            }
            setFieldErrors(parsed)
          }

          throw new Error(err.error || `Request failed (${code})`)
        }

        if (!response.body) throw new Error('No response body received')

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // SSE events are delimited by double newlines
          const parts = buffer.split('\n\n')
          buffer = parts.pop() ?? ''

          for (const part of parts) {
            const line = part.trim()
            if (!line.startsWith('data: ')) continue

            let event: {
              type: string
              text?: string
              usageId?: string
              provider?: string
              durationMs?: number
              message?: string
              isDemo?: boolean
              demoRunsUsed?: number
            }
            try {
              event = JSON.parse(line.slice(6))
            } catch {
              continue
            }

            if (event.type === 'chunk' && event.text) {
              setOutput((prev) => prev + event.text)
            } else if (event.type === 'done') {
              setUsageId(event.usageId ?? null)
              setProvider((event.provider ?? '').toLowerCase())
              setDurationMs(event.durationMs ?? 0)
              addRecentTool(toolId)
              if (event.isDemo) {
                setIsDemo(true)
                setDemoRunsUsed(event.demoRunsUsed ?? 0)
                queryClient.invalidateQueries({ queryKey: ['demo-status'] })
              }
            } else if (event.type === 'error') {
              // SseError suppresses toast — the RunErrorBanner shows this inline
              throw new SseError(event.message || 'An error occurred while generating the response')
            }
          }
        }
      } catch (e) {
        const msg = getErrorMessage(e, 'Something went wrong. Please try again.')
        setError(msg)
        // Only toast for non-SSE errors — SSE errors are shown in the inline banner
        if (!(e instanceof SseError)) {
          toast.error(msg)
        }
      } finally {
        setIsStreaming(false)
      }
    },
    [toolId, addRecentTool, queryClient]
  )

  return {
    output,
    setOutput,
    isStreaming,
    usageId,
    provider,
    durationMs,
    error,
    errorCode,
    retryAfterSec,
    fieldErrors,
    runStream,
    isDemo,
    demoRunsUsed,
  }
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
