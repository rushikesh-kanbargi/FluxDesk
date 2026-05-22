/**
 * All HTTP calls from this store go through src/lib/api.ts — never use bare fetch().
 * The Zustand store lives outside the React tree, so any new fetch utility added here
 * must explicitly attach auth via getAuthHeaders(). apiPost/apiGet handle this automatically.
 */
import { create } from 'zustand'
import { apiPost } from '@/lib/api'

export type StepStatus = 'waiting' | 'running' | 'complete' | 'failed'

export interface StepState {
  order: number
  toolId: string
  status: StepStatus
  output: string | null
  error: string | null
}

export type RunStatus = 'running' | 'complete' | 'failed'

export interface ActiveRun {
  pipelineId: string
  runId: string
  initialInput: string
  steps: StepState[]
  overallStatus: RunStatus
}

interface PipelineRunStore {
  activeRun: ActiveRun | null
  startRun: (
    pipelineId: string,
    pipelineSteps: Array<{ order: number; toolId: string }>,
    initialInput: string,
  ) => Promise<void>
  retryStep: (stepOrder: number) => Promise<void>
  clearRun: () => void
}

export const usePipelineRunStore = create<PipelineRunStore>((set, get) => {
  // Internal: execute a single step and advance the chain.
  // Lives outside React so the request survives component unmounts.
  async function executeStep(stepOrder: number, runId: string, skipCache = false) {
    const run = get().activeRun
    if (!run || run.runId !== runId) return  // guard: stale run

    // Mark this step as running
    set((s) => {
      if (!s.activeRun || s.activeRun.runId !== runId) return s
      return {
        activeRun: {
          ...s.activeRun,
          steps: s.activeRun.steps.map((st) =>
            st.order === stepOrder ? { ...st, status: 'running' as StepStatus } : st,
          ),
        },
      }
    })

    // Collect outputs from completed steps
    const stepOutputs: Record<string, string> = {}
    for (const st of run.steps) {
      if (st.status === 'complete' && st.output !== null) {
        stepOutputs[`step_${st.order}`] = st.output
      }
    }

    try {
      const { stepOutput } = await apiPost<{ stepOutput: string }>(
        `/pipelines/${run.pipelineId}/run/step`,
        { runId, stepOrder, initialInput: run.initialInput, stepOutputs, skipCache },
      )

      set((s) => {
        if (!s.activeRun || s.activeRun.runId !== runId) return s
        const steps = s.activeRun.steps.map((st) =>
          st.order === stepOrder
            ? { ...st, status: 'complete' as StepStatus, output: stepOutput }
            : st,
        )
        const isLast = stepOrder === s.activeRun.steps.length
        return {
          activeRun: {
            ...s.activeRun,
            steps,
            overallStatus: isLast ? ('complete' as RunStatus) : s.activeRun.overallStatus,
          },
        }
      })

      // Advance to next step if not last and this run is still active.
      // Propagate skipCache: if we're retrying from step N, all subsequent
      // steps also need fresh output (their cached DB values came from the
      // previous run the user just rejected).
      const current = get().activeRun
      if (current && current.runId === runId && stepOrder < current.steps.length) {
        await executeStep(stepOrder + 1, runId, skipCache)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Step failed'
      set((s) => {
        if (!s.activeRun || s.activeRun.runId !== runId) return s
        return {
          activeRun: {
            ...s.activeRun,
            overallStatus: 'failed' as RunStatus,
            steps: s.activeRun.steps.map((st) =>
              st.order === stepOrder
                ? { ...st, status: 'failed' as StepStatus, error: message }
                : st,
            ),
          },
        }
      })
    }
  }

  return {
    activeRun: null,

    async startRun(pipelineId, pipelineSteps, initialInput) {
      const { runId } = await apiPost<{ runId: string }>(
        `/pipelines/${pipelineId}/run`,
        {},
      )

      const steps: StepState[] = pipelineSteps.map((s) => ({
        order: s.order,
        toolId: s.toolId,
        status: 'waiting',
        output: null,
        error: null,
      }))

      set({
        activeRun: {
          pipelineId,
          runId,
          initialInput,
          steps,
          overallStatus: 'running',
        },
      })

      await executeStep(1, runId)
    },

    async retryStep(stepOrder) {
      const run = get().activeRun
      if (!run) return
      const { runId } = run

      // Reset this step (and clear any downstream failures) then re-execute
      set((s) => {
        if (!s.activeRun || s.activeRun.runId !== runId) return s
        return {
          activeRun: {
            ...s.activeRun,
            overallStatus: 'running' as RunStatus,
            steps: s.activeRun.steps.map((st) =>
              st.order >= stepOrder
                ? { ...st, status: 'waiting' as StepStatus, output: null, error: null }
                : st,
            ),
          },
        }
      })

      // skipCache=true: user explicitly wants fresh output, bypass DB cache
      // for this step and all downstream steps.
      await executeStep(stepOrder, runId, true)
    },

    clearRun() {
      set({ activeRun: null })
    },
  }
})
