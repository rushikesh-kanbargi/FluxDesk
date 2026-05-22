import { prisma } from './prisma'
import { callAI } from './aiService'
import { getToolById } from './toolDefinitions'
import { buildPersonalisationContext, getMemoryContext } from './memoryService'

/**
 * Resolves template variables in a string:
 * {{initial_input}} → the initialInput value
 * {{step_N.output}} → output of step at order N (1-indexed)
 */
function resolveTemplate(
  template: string,
  initialInput: string,
  stepOutputs: Record<string, string>
): string {
  return template
    .replace(/\{\{initial_input\}\}/g, initialInput)
    .replace(/\{\{step_(\d+)\.output\}\}/g, (_match, n) => {
      const key = `step_${n}`
      return stepOutputs[key] ?? ''
    })
}

/**
 * Resolves the inputMapping for a step into concrete field values.
 * inputMapping is a JSON object: { fieldName: templateString }
 */
function resolveInputMapping(
  mapping: Record<string, string>,
  initialInput: string,
  stepOutputs: Record<string, string>
): Record<string, string> {
  const resolved: Record<string, string> = {}
  for (const [field, template] of Object.entries(mapping)) {
    resolved[field] = resolveTemplate(template, initialInput, stepOutputs)
  }
  return resolved
}

/**
 * Build user message for a tool given resolved inputs.
 * Mirrors the logic in the tool run route.
 */
function buildStepUserMessage(toolId: string, inputs: Record<string, string>): string {
  void toolId // toolId reserved for future per-tool formatting
  return Object.entries(inputs)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n\n')
}

/**
 * Execute a single pipeline step.
 *
 * Idempotent: if stepOutputs[step_N] is already present in the DB run record,
 * returns the cached output without calling the AI again. This makes retries
 * safe on network blips or double-calls.
 *
 * Marks the run COMPLETED when the last step finishes successfully.
 * Marks the run FAILED if this step throws.
 */
export async function executeSingleStep(
  runId: string,
  pipelineId: string,
  userId: string,
  stepOrder: number,
  initialInput: string,
  previousOutputs: Record<string, string>,
  skipCache = false,
): Promise<{ stepOutput: string }> {
  // Ownership + load run
  const run = await prisma.pipelineRun.findFirst({
    where: { id: runId, userId, pipelineId },
  })
  if (!run) throw new Error('Pipeline run not found')

  // Idempotency: return cached output if this step already completed.
  // skipCache=true when user explicitly retries a step — we want fresh AI output,
  // not the cached result from the run they rejected.
  if (!skipCache) {
    const cached = (run.stepOutputs as Record<string, string>)[`step_${stepOrder}`]
    if (cached) return { stepOutput: cached }
  }

  // Load pipeline to get step definition and total step count
  const pipeline = await prisma.pipeline.findFirst({
    where: { id: pipelineId, userId },
    include: { steps: { orderBy: { order: 'asc' } } },
  })
  if (!pipeline) throw new Error('Pipeline not found')

  const step = pipeline.steps.find((s) => s.order === stepOrder)
  if (!step) throw new Error(`Step ${stepOrder} not found in pipeline`)

  const tool = getToolById(step.toolId)
  if (!tool) throw new Error(`Unknown tool: ${step.toolId}`)

  const memCtx = await getMemoryContext(userId)
  const personalisation = buildPersonalisationContext(memCtx)

  const mapping = step.inputMapping as Record<string, string>
  const resolvedInputs = resolveInputMapping(mapping, initialInput, previousOutputs)
  const userMessage = buildStepUserMessage(step.toolId, resolvedInputs)
  const systemPrompt = tool.buildSystem(personalisation)

  let stepOutput: string
  try {
    const { text } = await callAI({
      userId,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      maxTokens: 1500,
    })
    stepOutput = text
  } catch (err) {
    // Mark run FAILED; partial outputs already in DB from previous steps
    await prisma.pipelineRun.update({
      where: { id: runId },
      data: { status: 'FAILED', completedAt: new Date() },
    })
    throw err
  }

  // Persist this step's output
  const updatedOutputs: Record<string, string> = {
    ...(run.stepOutputs as Record<string, string>),
    ...previousOutputs,
    [`step_${stepOrder}`]: stepOutput,
  }

  const isLastStep = stepOrder === pipeline.steps.length
  await prisma.pipelineRun.update({
    where: { id: runId },
    data: {
      stepOutputs: updatedOutputs,
      ...(isLastStep ? { status: 'COMPLETED', completedAt: new Date() } : {}),
    },
  })

  return { stepOutput }
}

// ── Legacy full-pipeline executor (kept for reference, not called in new path) ──

export interface PipelineExecutionResult {
  success: boolean
  finalOutput: string
  stepOutputs: Record<string, string>
  error?: string
}

export async function executePipeline(
  pipelineId: string,
  userId: string,
  initialInput: string
): Promise<PipelineExecutionResult> {
  const pipeline = await prisma.pipeline.findFirst({
    where: { id: pipelineId, userId },
    include: { steps: { orderBy: { order: 'asc' } } },
  })

  if (!pipeline) throw new Error('Pipeline not found')

  const run = await prisma.pipelineRun.create({
    data: { pipelineId, userId, status: 'RUNNING', stepOutputs: {} },
  })

  const stepOutputs: Record<string, string> = {}
  const memCtx = await getMemoryContext(userId)
  const personalisation = buildPersonalisationContext(memCtx)

  try {
    for (const step of pipeline.steps) {
      const tool = getToolById(step.toolId)
      if (!tool) throw new Error(`Unknown tool: ${step.toolId}`)

      const mapping = step.inputMapping as Record<string, string>
      const resolvedInputs = resolveInputMapping(mapping, initialInput, stepOutputs)
      const userMessage = buildStepUserMessage(step.toolId, resolvedInputs)
      const systemPrompt = tool.buildSystem(personalisation)

      const { text } = await callAI({
        userId,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        maxTokens: 1500,
      })

      stepOutputs[`step_${step.order}`] = text
      await prisma.pipelineRun.update({
        where: { id: run.id },
        data: { stepOutputs },
      })
    }

    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: { status: 'COMPLETED', completedAt: new Date(), stepOutputs },
    })

    const lastStep = pipeline.steps[pipeline.steps.length - 1]
    const finalOutput = stepOutputs[`step_${lastStep?.order ?? 1}`] ?? ''
    return { success: true, finalOutput, stepOutputs }
  } catch (err) {
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: { status: 'FAILED', completedAt: new Date(), stepOutputs },
    })
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, finalOutput: '', stepOutputs, error: message }
  }
}
