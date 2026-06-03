/**
 * RED until H1: createPipelineSchema is extracted to pipelineSchemas.ts
 * with steps.max(10) and stepOutputs size guards (H2).
 *
 * This import will fail until that module is created — intentional RED state.
 */
import { describe, it, expect } from 'vitest'
import { createPipelineSchema, stepOutputsSchema } from '@/lib/server/pipelineSchemas'

const validStep = { toolId: 'forge', order: 1, inputMapping: {} }
const makeSteps = (n: number) => Array.from({ length: n }, (_, i) => ({ ...validStep, order: i + 1 }))

describe('createPipelineSchema', () => {
  it('accepts a minimal pipeline (name only)', () => {
    const r = createPipelineSchema.safeParse({ name: 'My Pipeline' })
    expect(r.success).toBe(true)
  })

  it('accepts 10 steps (upper bound)', () => {
    const r = createPipelineSchema.safeParse({ name: 'Pipeline', steps: makeSteps(10) })
    expect(r.success).toBe(true)
  })

  it('rejects 11 steps (H1: enforces max 10)', () => {
    const r = createPipelineSchema.safeParse({ name: 'Pipeline', steps: makeSteps(11) })
    expect(r.success).toBe(false)
  })

  it('rejects empty name', () => {
    const r = createPipelineSchema.safeParse({ name: '' })
    expect(r.success).toBe(false)
  })

  it('rejects name exceeding 100 chars', () => {
    const r = createPipelineSchema.safeParse({ name: 'a'.repeat(101) })
    expect(r.success).toBe(false)
  })

  it('rejects description exceeding 500 chars', () => {
    const r = createPipelineSchema.safeParse({
      name: 'Pipeline',
      description: 'x'.repeat(501),
    })
    expect(r.success).toBe(false)
  })

  it('defaults steps to empty array when omitted', () => {
    const r = createPipelineSchema.safeParse({ name: 'Pipeline' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.steps).toEqual([])
  })
})

describe('stepOutputsSchema (H2: bounded values)', () => {
  it('accepts an empty record', () => {
    const r = stepOutputsSchema.safeParse({})
    expect(r.success).toBe(true)
  })

  it('accepts up to 20 entries', () => {
    const entries = Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [`key${i}`, 'value'])
    )
    const r = stepOutputsSchema.safeParse(entries)
    expect(r.success).toBe(true)
  })

  it('rejects more than 20 entries (H2: max 20 keys)', () => {
    const entries = Object.fromEntries(
      Array.from({ length: 21 }, (_, i) => [`key${i}`, 'value'])
    )
    const r = stepOutputsSchema.safeParse(entries)
    expect(r.success).toBe(false)
  })

  it('rejects a value exceeding 10 000 chars (H2: per-value max)', () => {
    const r = stepOutputsSchema.safeParse({ result: 'x'.repeat(10_001) })
    expect(r.success).toBe(false)
  })

  it('accepts a value of exactly 10 000 chars', () => {
    const r = stepOutputsSchema.safeParse({ result: 'x'.repeat(10_000) })
    expect(r.success).toBe(true)
  })
})
