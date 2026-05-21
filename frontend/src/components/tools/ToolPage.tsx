'use client'

import { useState, useCallback } from 'react'
import { notFound } from 'next/navigation'
import { TOOL_CONFIGS, TOOL_CATEGORIES } from './configs'
import { ToolHeader } from './ToolHeader'
import { InputPanel } from './InputPanel'
import { OutputPanel } from './OutputPanel'
import { HistoryDrawer } from './HistoryDrawer'
import { useStreamTool, useRateTool } from '@/hooks/useTools'
import { useSavePrompt } from '@/hooks/usePrompts'
import { useUIStore } from '@/store/uiStore'
import toast from 'react-hot-toast'

interface ToolPageProps {
  toolId: string
}

export function ToolPage({ toolId }: ToolPageProps) {
  const config = TOOL_CONFIGS[toolId]
  if (!config) notFound()

  const [historyOpen, setHistoryOpen] = useState(false)
  const [rated, setRated] = useState<number | null>(null)

  const { output, setOutput, isStreaming, usageId, provider, durationMs, error: runError, runStream } = useStreamTool(toolId)
  const rateTool = useRateTool()
  const savePrompt = useSavePrompt()
  const activeProvider = useUIStore((s) => s.activeProvider)
  const activeProjectId = useUIStore((s) => s.activeProjectId)

  const handleRun = useCallback(async (input: Record<string, unknown>) => {
    setRated(null)
    await runStream({
      ...input,
      preferredProvider: activeProvider,
      projectId: activeProjectId ?? undefined,
    })
  }, [runStream, activeProvider, activeProjectId])

  const handleRate = useCallback(async (rating: number) => {
    if (!usageId) return
    setRated(rating)
    await rateTool.mutateAsync({ usageId, rating })
    toast.success(rating > 3 ? 'Thanks for the feedback!' : "Got it, we'll improve this")
  }, [usageId, rateTool])

  const handleSave = useCallback(async (title: string) => {
    if (!output) return
    await savePrompt.mutateAsync({
      title,
      body: output,
      toolId,
      provider,
    })
  }, [output, savePrompt, toolId, provider])

  const categoryStyle = TOOL_CATEGORIES[config.category as keyof typeof TOOL_CATEGORIES]

  return (
    <div className="h-full flex flex-col">
      <ToolHeader
        config={config}
        categoryStyle={categoryStyle}
        onHistoryClick={() => setHistoryOpen(true)}
        isRunning={isStreaming}
      />

      {runError && (
        <div className="mx-5 mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {runError}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <div className="h-full xl:grid xl:grid-cols-2 xl:divide-x xl:divide-[rgba(255,255,255,0.06)] flex flex-col">
          {/* Input Panel */}
          <div className="xl:overflow-auto overflow-visible">
            <InputPanel
              config={config}
              onSubmit={handleRun}
              isRunning={isStreaming}
            />
          </div>

          {/* Output Panel */}
          <div className="flex-1 xl:flex-none xl:overflow-auto border-t border-[rgba(255,255,255,0.06)] xl:border-t-0">
            <OutputPanel
              output={output}
              isRunning={isStreaming}
              provider={provider}
              durationMs={durationMs}
              outputLabel={config.outputLabel}
              usageId={usageId}
              rated={rated}
              onRate={handleRate}
              onSave={handleSave}
              isSaving={savePrompt.isPending}
              toolId={toolId}
            />
          </div>
        </div>
      </div>

      {/* History drawer */}
      <HistoryDrawer
        toolId={toolId}
        toolName={config.name}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onRestore={(restoredOutput) => {
          setOutput(restoredOutput)
          setHistoryOpen(false)
        }}
      />
    </div>
  )
}
