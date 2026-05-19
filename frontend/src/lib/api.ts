import { createClient } from './supabase'
import { ApiError, type ApiErrorDetails } from './errors'
import { useAuthStore } from '@/store/authStore'

// All API routes are Next.js routes — always use relative paths
const BASE = ''

async function getAuthHeaders(): Promise<Record<string, string>> {
  // Try the store first (fast, no network call)
  const storeToken = useAuthStore.getState().session?.access_token
  if (storeToken) {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${storeToken}`,
    }
  }
  // Fallback to Supabase session (covers SSR / pre-init edge cases)
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  return headers
}

function parseErrorPayload(
  res: Response,
  body: string
): { message: string; details?: ApiErrorDetails; raw?: unknown } {
  if (!body.trim()) {
    return { message: res.statusText || `Request failed (${res.status})` }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    return { message: body.length > 280 ? `${body.slice(0, 277)}…` : body }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { message: `Request failed (${res.status})` }
  }
  const o = parsed as Record<string, unknown>
  const details = Array.isArray(o.details) ? (o.details as ApiErrorDetails) : undefined
  let errPart: string | null = null
  if (typeof o.error === 'string') {
    errPart = o.error
  } else if (o.error && typeof o.error === 'object' && o.error !== null) {
    const e = o.error as Record<string, unknown>
    if (typeof e.message === 'string') errPart = e.message
  }
  if (!errPart && typeof o.message === 'string') errPart = o.message
  if (!errPart) errPart = res.statusText || `Request failed (${res.status})`

  let message = errPart
  if (details && details.length > 0) {
    const first = details
      .slice(0, 4)
      .map((d) => (d.field ? `${d.field}: ` : '') + d.message)
      .filter(Boolean)
    if (first.length) {
      message = first.length > 1 ? `${errPart} (${first.join(' · ')})` : `${errPart} — ${first[0]}`
    }
  }
  return { message, details, raw: parsed }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    const body = await res.text()
    const { message: apiMsg } = parseErrorPayload(res, body)
    const userMessage =
      apiMsg && !apiMsg.startsWith('Request failed')
        ? apiMsg
        : 'Your session has expired. Please sign in again.'
    if (typeof window !== 'undefined') {
      window.location.href = '/login?expired=1'
    }
    throw new ApiError(userMessage, 401, 'UNAUTHORIZED', undefined, { silent: true })
  }
  if (!res.ok) {
    const body = await res.text()
    const { message, details } = parseErrorPayload(res, body)
    throw new ApiError(
      message,
      res.status,
      String(res.status),
      details,
    )
  }
  const text = await res.text()
  if (!text) return undefined as T
  try {
    return JSON.parse(text) as T
  } catch {
    return text as unknown as T
  }
}

async function requestWithHandling<T>(fetchFn: () => Promise<Response>): Promise<T> {
  try {
    const res = await fetchFn()
    return await handleResponse<T>(res)
  } catch (e) {
    if (e instanceof ApiError) throw e
    if (e instanceof TypeError) {
      const m = (e as Error).message || ''
      if (m.toLowerCase().includes('failed to fetch') || m.toLowerCase().includes('network')) {
        throw new ApiError(
          'Could not reach the server. If you are running locally, start the backend and check NEXT_PUBLIC_API_URL.',
          0,
          'NETWORK',
        )
      }
    }
    throw e
  }
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  return requestWithHandling<T>(async () =>
    fetch(`${BASE}/api${path}`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    })
  )
}

export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  return requestWithHandling<T>(async () =>
    fetch(`${BASE}/api${path}`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  )
}

export async function apiPatch<T = unknown>(path: string, body?: unknown): Promise<T> {
  return requestWithHandling<T>(async () =>
    fetch(`${BASE}/api${path}`, {
      method: 'PATCH',
      headers: await getAuthHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  )
}

export async function apiDelete<T = unknown>(path: string): Promise<T> {
  return requestWithHandling<T>(async () =>
    fetch(`${BASE}/api${path}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    })
  )
}

// Legacy shape used by React Query hooks — { data: T } matches axios
export const api = {
  get: <T = unknown>(path: string) => apiGet<T>(path).then((data) => ({ data })),
  post: <T = unknown>(path: string, body?: unknown) => apiPost<T>(path, body).then((data) => ({ data })),
  patch: <T = unknown>(path: string, body?: unknown) => apiPatch<T>(path, body).then((data) => ({ data })),
  delete: <T = unknown>(path: string) => apiDelete<T>(path).then((data) => ({ data })),
}
