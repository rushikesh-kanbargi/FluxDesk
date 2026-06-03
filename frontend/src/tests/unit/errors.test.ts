import { describe, it, expect } from 'vitest'
import { ZodError } from 'zod'
import { z } from 'zod'
import { createError, handleRouteError } from '@/lib/server/errors'

describe('createError', () => {
  it('creates an Error with the given message', () => {
    const err = createError('Not found', 404)
    expect(err.message).toBe('Not found')
    expect(err).toBeInstanceOf(Error)
  })

  it('attaches the status code to the error', () => {
    const err = createError('Forbidden', 403) as Error & { status: number }
    expect(err.status).toBe(403)
  })
})

describe('handleRouteError', () => {
  it('returns 400 with field details for a ZodError', async () => {
    const schema = z.object({ name: z.string().min(3) })
    const result = schema.safeParse({ name: 'x' })
    expect(result.success).toBe(false)
    const zodErr = (result as { success: false; error: ZodError }).error

    const res = handleRouteError(zodErr)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.details[0].field).toBe('name')
  })

  it('returns the error status code for a status-tagged Error', async () => {
    const err = createError('Not found', 404)
    const res = handleRouteError(err)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Not found')
  })

  it('returns 500 for a plain Error without a status', async () => {
    const res = handleRouteError(new Error('boom'))
    expect(res.status).toBe(500)
  })

  it('hides internal error messages in production', async () => {
    const orig = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    const res = handleRouteError(new Error('sensitive internal detail'))
    const body = await res.json()
    expect(body.error).toBe('Internal server error')
    process.env.NODE_ENV = orig
  })

  it('returns 500 for unknown (non-Error) thrown values', async () => {
    const res = handleRouteError('a string was thrown')
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Unknown error')
  })
})
