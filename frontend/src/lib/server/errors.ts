import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export function handleRouteError(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Please check the highlighted fields and try again.',
        details: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      },
      { status: 400 }
    )
  }
  if (err instanceof Error) {
    const status = (err as Error & { status?: number }).status ?? 500
    const message =
      process.env.NODE_ENV === 'production' && status === 500 ? 'Internal server error' : err.message
    return NextResponse.json({ error: message }, { status })
  }
  return NextResponse.json({ error: 'Unknown error' }, { status: 500 })
}

export function createError(message: string, status: number): Error {
  const err = new Error(message) as Error & { status: number }
  err.status = status
  return err
}
