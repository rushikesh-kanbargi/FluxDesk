/**
 * API errors with HTTP context (from {@link createApiError} / `api.ts`).
 * Use {@link getErrorMessage} in UI — never read `response` (axios) on fetch-based errors.
 */
export type ApiErrorDetails = Array<{ field: string; message: string }>

export class ApiError extends Error {
  override readonly name = 'ApiError'

  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: ApiErrorDetails,
    public readonly options?: { silent?: boolean }
  ) {
    super(message)
  }

  get silent() {
    return this.options?.silent === true
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

/**
 * User-facing string from any thrown value (Error, ApiError, network failures, etc.).
 * Returns empty string when the error is intentionally silent (e.g. session redirect).
 */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof ApiError) {
    if (error.silent) return ''
    if (error.message) return error.message
    return fallback
  }
  if (error instanceof TypeError) {
    const m = String(error.message || error).toLowerCase()
    if (m.includes('network') || m.includes('failed to fetch') || m.includes('load failed')) {
      return 'Could not reach the server. Check your connection and that the app backend is running.'
    }
  }
  if (error instanceof Error) {
    const m = error.message
    if (!m) return fallback
    if (m === 'Unauthorized' || m === 'unauthorized') {
      return 'You need to sign in again to continue.'
    }
    if (m.toLowerCase().includes('failed to fetch') || m.toLowerCase().includes('networkerror')) {
      return 'Could not reach the server. Check your connection and that the app backend is running.'
    }
    return m
  }
  if (typeof error === 'string' && error.trim()) return error.trim()
  return fallback
}
