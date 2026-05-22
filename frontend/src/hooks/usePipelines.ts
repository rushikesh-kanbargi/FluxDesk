import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api'

export interface PipelineStepData {
  id: string
  toolId: string
  order: number
  inputMapping: Record<string, string>
}

export interface Pipeline {
  id: string
  name: string
  description: string | null
  shareToken: string | null
  steps: PipelineStepData[]
  createdAt: string
  updatedAt: string
  _count?: { runs: number }
}

export interface PipelineRun {
  id: string
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  stepOutputs: Record<string, string>
  startedAt: string
  completedAt: string | null
}

export interface PipelineDetail extends Pipeline {
  runs: PipelineRun[]
}

export interface RunResult {
  runId: string
  finalOutput: string
  stepOutputs: Record<string, string>
  durationMs: number
}

export function usePipelines() {
  return useQuery({
    queryKey: ['pipelines'],
    queryFn: () =>
      apiGet<{ pipelines: Pipeline[] }>('/pipelines').then((d) => d.pipelines),
    staleTime: 30_000,
  })
}

export function usePipeline(id: string) {
  return useQuery({
    queryKey: ['pipelines', id],
    queryFn: () =>
      apiGet<{ pipeline: PipelineDetail }>(`/pipelines/${id}`).then(
        (d) => d.pipeline,
      ),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useCreatePipeline() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      name: string
      description?: string
      steps?: Omit<PipelineStepData, 'id'>[]
    }) => apiPost<{ pipeline: Pipeline }>('/pipelines', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipelines'] }),
  })
}

export function useUpdatePipeline() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: {
        name?: string
        description?: string
        steps?: Omit<PipelineStepData, 'id'>[]
      }
    }) => apiPatch<{ pipeline: Pipeline }>(`/pipelines/${id}`, data),
    onSuccess: (_r, { id }) => {
      qc.invalidateQueries({ queryKey: ['pipelines'] })
      qc.invalidateQueries({ queryKey: ['pipelines', id] })
    },
  })
}

export function useDeletePipeline() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/pipelines/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipelines'] }),
  })
}

export function useRunPipeline() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      initialInput,
    }: {
      id: string
      initialInput: string
    }) =>
      apiPost<RunResult>(`/pipelines/${id}/run`, { initialInput }),
    onSuccess: (_r, { id }) => {
      qc.invalidateQueries({ queryKey: ['pipelines', id] })
    },
  })
}

export function useSharePipeline() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiPost<{ shareToken: string; shareUrl: string }>(`/pipelines/${id}/share`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipelines'] }),
  })
}

export function useRevokePipelineShare() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/pipelines/${id}/share`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipelines'] }),
  })
}

export function usePipelineRuns(pipelineId: string) {
  return useQuery({
    queryKey: ['pipelines', pipelineId, 'runs'],
    queryFn: () =>
      apiGet<{ runs: PipelineRun[] }>(`/pipelines/${pipelineId}/runs`).then(
        (d) => d.runs,
      ),
    enabled: !!pipelineId,
    staleTime: 15_000,
  })
}
