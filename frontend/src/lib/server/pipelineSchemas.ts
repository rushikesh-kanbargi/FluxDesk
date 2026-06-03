import { z } from 'zod'

export const pipelineStepSchema = z.object({
  toolId: z.string().min(1),
  order: z.number().int().min(1),
  inputMapping: z.record(z.string(), z.string()),
})

// H1: max 10 steps per pipeline
export const createPipelineSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  steps: z.array(pipelineStepSchema).max(10).optional().default([]),
})

// H2: bound stepOutputs to prevent unbounded memory/DB writes
export const stepOutputsSchema = z
  .record(z.string(), z.string().max(10_000))
  .refine((obj) => Object.keys(obj).length <= 20, {
    message: 'stepOutputs must not exceed 20 entries',
  })
