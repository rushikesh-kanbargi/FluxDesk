'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  Plus, Play, Pencil, X, ChevronUp, ChevronDown,
  CheckCircle2, XCircle, Loader2, Copy, Check,
  GitBranch, Search, ChevronRight, Link2, Link2Off,
  ArrowRight, Workflow,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { cn, Button, Card, ErrorAlert, EmptyState, LoadingSpinner } from '@/components/ui'
import { TOOL_CONFIGS, TOOL_CATEGORIES, ALL_TOOLS } from '@/components/tools/configs'
import {
  usePipelines,
  useCreatePipeline,
  useUpdatePipeline,
  useDeletePipeline,
  useRunPipeline,
  useSharePipeline,
  useRevokePipelineShare,
  type Pipeline,
  type PipelineStepData,
  type RunResult,
} from '@/hooks/usePipelines'
import { PIPELINE_TEMPLATES, type PipelineTemplate } from '@/lib/pipelineTemplates'
import toast from 'react-hot-toast'

// ── Types ────────────────────────────────────────────────────────────────────

type View =
  | { type: 'list' }
  | { type: 'builder'; pipelineId?: string }
  | { type: 'run'; pipelineId: string }

interface DraftStep {
  _key: string   // local-only key for React reconciliation
  toolId: string
  order: number
  inputMapping: Record<string, string>
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function categoryColor(toolId: string): string {
  const cfg = TOOL_CONFIGS[toolId]
  if (!cfg) return 'rgba(255,255,255,0.2)'
  return TOOL_CATEGORIES[cfg.category].color
}

function toolName(toolId: string): string {
  return TOOL_CONFIGS[toolId]?.name ?? toolId
}

function toolCategory(toolId: string): string {
  return TOOL_CONFIGS[toolId]?.category ?? ''
}

let keyCounter = 0
function nextKey() { return `step-${++keyCounter}` }

function stepsToSave(steps: DraftStep[]): Omit<PipelineStepData, 'id'>[] {
  return steps.map((s, i) => ({
    toolId: s.toolId,
    order: i + 1,
    inputMapping: s.inputMapping,
  }))
}

// ── Sub-components ────────────────────────────────────────────────────────────

// Step connector arrow
function StepArrow() {
  return (
    <div className="flex justify-center items-center py-0.5">
      <div className="flex flex-col items-center gap-0.5">
        <div className="w-px h-3 bg-[rgba(255,255,255,0.12)]" />
        <ChevronDown size={10} className="text-[rgba(255,255,255,0.2)] -mt-1" />
      </div>
    </div>
  )
}

// Tool picker left panel
function ToolPickerPanel({ onAdd }: { onAdd: (toolId: string) => void }) {
  const [q, setQ] = useState('')

  const grouped = useMemo(() => {
    const lower = q.toLowerCase()
    const filtered = ALL_TOOLS.filter(
      (t) =>
        !q || t.name.toLowerCase().includes(lower) || t.category.toLowerCase().includes(lower),
    )
    const map = new Map<string, typeof filtered>()
    for (const t of filtered) {
      if (!map.has(t.category)) map.set(t.category, [])
      map.get(t.category)!.push(t)
    }
    return Array.from(map.entries())
  }, [q])

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-[rgba(255,255,255,0.06)]">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.3)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tools..."
            className="w-full h-8 pl-7 pr-3 rounded-md bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-xs text-white placeholder:text-[rgba(255,255,255,0.3)] focus:outline-none focus:border-[rgba(245,166,35,0.35)]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none p-2 space-y-3">
        {grouped.map(([cat, tools]) => {
          const catColor = TOOL_CATEGORIES[cat as keyof typeof TOOL_CATEGORIES]?.color ?? '#888'
          return (
            <div key={cat}>
              <p className="text-[9px] uppercase tracking-widest px-2 pb-1" style={{ color: catColor }}>
                {cat}
              </p>
              <div className="space-y-0.5">
                {tools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => onAdd(tool.id)}
                    className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[rgba(255,255,255,0.06)] transition-colors group"
                  >
                    <span className="text-base leading-none">{tool.icon}</span>
                    <span className="text-xs text-[rgba(255,255,255,0.75)] group-hover:text-white transition-colors flex-1 truncate">
                      {tool.name}
                    </span>
                    <Plus size={10} className="opacity-0 group-hover:opacity-100 text-[rgba(255,255,255,0.4)] transition-opacity flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )
        })}
        {grouped.length === 0 && (
          <p className="text-xs text-[rgba(255,255,255,0.3)] text-center py-4">No tools found</p>
        )}
      </div>
    </div>
  )
}

// Step card on canvas
interface StepCardProps {
  step: DraftStep
  index: number
  total: number
  selected: boolean
  onSelect: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
}

function StepCard({ step, index, total, selected, onSelect, onMoveUp, onMoveDown, onDelete }: StepCardProps) {
  const color = categoryColor(step.toolId)
  const cfg = TOOL_CONFIGS[step.toolId]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      onClick={onSelect}
      className={cn(
        'relative rounded-lg border cursor-pointer transition-all',
        'border-l-[3px]',
        selected
          ? 'bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.14)]'
          : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.10)] hover:bg-[rgba(255,255,255,0.05)]',
      )}
      style={{ borderLeftColor: color }}
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span className="text-[rgba(255,255,255,0.3)] text-[10px] tabular-nums w-4 flex-shrink-0">
          {index + 1}
        </span>
        <span className="text-sm leading-none flex-shrink-0">{cfg?.icon ?? '⚙️'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white truncate">{toolName(step.toolId)}</p>
          <p className="text-[10px] text-[rgba(255,255,255,0.4)]">{toolCategory(step.toolId)}</p>
        </div>
        {/* Controls */}
        <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            aria-label="Move step up"
            className="p-1 rounded hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-25 disabled:cursor-not-allowed transition-colors text-[rgba(255,255,255,0.4)] hover:text-white"
          >
            <ChevronUp size={12} />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            aria-label="Move step down"
            className="p-1 rounded hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-25 disabled:cursor-not-allowed transition-colors text-[rgba(255,255,255,0.4)] hover:text-white"
          >
            <ChevronDown size={12} />
          </button>
          <button
            onClick={onDelete}
            aria-label="Remove step"
            className="p-1 rounded hover:bg-[rgba(244,63,94,0.12)] transition-colors text-[rgba(255,255,255,0.3)] hover:text-rose-400"
          >
            <X size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// Right panel — step config
interface StepConfigPanelProps {
  step: DraftStep | null
  stepIndex: number
  totalSteps: number
  onChange: (inputMapping: Record<string, string>) => void
}

function StepConfigPanel({ step, stepIndex, totalSteps, onChange }: StepConfigPanelProps) {
  if (!step) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
        <ChevronRight size={20} className="text-[rgba(255,255,255,0.15)] mb-2" />
        <p className="text-xs text-[rgba(255,255,255,0.3)]">Select a step to configure its inputs</p>
      </div>
    )
  }

  const cfg = TOOL_CONFIGS[step.toolId]
  if (!cfg) return null

  const color = categoryColor(step.toolId)

  // Build source options: run time + previous step outputs + custom
  const sourceOptions = [
    { value: '__runtime__', label: 'Type at run time' },
    ...Array.from({ length: stepIndex }, (_, i) => ({
      value: `__step_${i}__`,
      label: `Step ${i + 1} output`,
    })),
    { value: '__custom__', label: 'Custom value' },
  ]

  // step is guaranteed non-null beyond this point
  const resolvedStep = step

  function handleSourceChange(fieldId: string, value: string) {
    onChange({ ...resolvedStep.inputMapping, [fieldId]: value })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{cfg.icon}</span>
          <div>
            <p className="text-xs font-semibold text-white">{cfg.name}</p>
            <p className="text-[10px]" style={{ color }}>{cfg.category}</p>
          </div>
        </div>
        {cfg.description && (
          <p className="text-[11px] text-[rgba(255,255,255,0.4)] mt-2 leading-relaxed">
            {cfg.description}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none p-3 space-y-3">
        {cfg.fields.map((field) => {
          const currentVal = resolvedStep.inputMapping[field.id] ?? '__runtime__'
          const isCustom = currentVal === '__custom__'
          const hasCustomText = isCustom || (!currentVal.startsWith('__'))

          return (
            <div key={field.id}>
              <label className="text-[10px] text-[rgba(255,255,255,0.5)] block mb-1">
                {field.label}
                {field.required && <span className="text-amber-400 ml-1">*</span>}
              </label>
              <select
                value={currentVal.startsWith('__') ? currentVal : '__custom__'}
                onChange={(e) => handleSourceChange(field.id, e.target.value)}
                className="w-full h-8 px-2 rounded-md bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-xs text-white focus:outline-none focus:border-[rgba(245,166,35,0.35)] appearance-none"
              >
                {sourceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#1f1f23]">
                    {opt.label}
                  </option>
                ))}
              </select>
              <AnimatePresence>
                {isCustom && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                    className="overflow-hidden"
                  >
                    <input
                      value={hasCustomText && !currentVal.startsWith('__') ? currentVal : ''}
                      onChange={(e) =>
                        onChange({ ...resolvedStep.inputMapping, [field.id]: e.target.value })
                      }
                      placeholder={field.placeholder ?? 'Enter custom value...'}
                      className="w-full h-8 px-2 mt-1 rounded-md bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-xs text-white placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[rgba(245,166,35,0.35)]"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
        {cfg.fields.length === 0 && (
          <p className="text-[11px] text-[rgba(255,255,255,0.3)] text-center py-4">
            This tool has no configurable inputs.
          </p>
        )}
      </div>
    </div>
  )
}

// Pipeline card in list view
interface PipelineCardProps {
  pipeline: Pipeline
  onEdit: () => void
  onRun: () => void
  onDelete: () => void
}

function PipelineCard({ pipeline, onEdit, onRun, onDelete }: PipelineCardProps) {
  const shownSteps = pipeline.steps.slice(0, 3)
  const overflow = pipeline.steps.length - 3
  const [sharePopoverOpen, setSharePopoverOpen] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const sharePipeline = useSharePipeline()
  const revokePipelineShare = useRevokePipelineShare()

  // Close popover on outside click
  useEffect(() => {
    if (!sharePopoverOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setSharePopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [sharePopoverOpen])

  const shareUrl = pipeline.shareToken
    ? `${window.location.origin}/share/${pipeline.shareToken}`
    : null

  const handleShareClick = async () => {
    // Token already exists — copy directly, no popover
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
      toast.success('Link copied')
      return
    }
    // First share — generate token then open popover
    try {
      await sharePipeline.mutateAsync(pipeline.id)
      setSharePopoverOpen(true)
    } catch {
      toast.error('Could not generate share link')
    }
  }

  const handleCopyFromPopover = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 2000)
  }

  const handleRevoke = async () => {
    try {
      await revokePipelineShare.mutateAsync(pipeline.id)
      setSharePopoverOpen(false)
      toast.success('Share link revoked')
    } catch {
      toast.error('Could not revoke share link')
    }
  }

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
    >
      <Card
        padding="md"
        className="flex flex-col gap-3 hover:border-[rgba(255,255,255,0.10)] transition-colors"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{pipeline.name}</p>
            {pipeline.description && (
              <p className="text-xs text-[rgba(255,255,255,0.4)] mt-0.5 line-clamp-2">
                {pipeline.description}
              </p>
            )}
          </div>
          <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.4)]">
            {pipeline.steps.length} step{pipeline.steps.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Tool chips */}
        {pipeline.steps.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {shownSteps.map((step) => {
              const color = categoryColor(step.toolId)
              return (
                <span
                  key={step.id}
                  className="text-[10px] px-2 py-0.5 rounded-full border"
                  style={{
                    color,
                    backgroundColor: `${color}18`,
                    borderColor: `${color}30`,
                  }}
                >
                  {toolName(step.toolId)}
                </span>
              )
            })}
            {overflow > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.35)]">
                +{overflow} more
              </span>
            )}
          </div>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between pt-1 border-t border-[rgba(255,255,255,0.05)]">
          <span className="text-[10px] text-[rgba(255,255,255,0.3)]">
            {pipeline._count?.runs
              ? `${pipeline._count.runs} run${pipeline._count.runs !== 1 ? 's' : ''}`
              : 'Never run'}{' '}
            · {formatDistanceToNow(new Date(pipeline.updatedAt), { addSuffix: true })}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={onRun}
              aria-label="Run pipeline"
              title="Run"
              className="p-1.5 rounded-md text-[rgba(255,255,255,0.4)] hover:text-emerald-400 hover:bg-[rgba(52,211,153,0.10)] transition-colors"
            >
              <Play size={12} />
            </button>

            {/* Share button */}
            <div className="relative" ref={popoverRef}>
              <button
                onClick={handleShareClick}
                disabled={sharePipeline.isPending}
                aria-label={shareUrl ? 'Copy share link' : 'Share pipeline'}
                title={shareUrl ? 'Copy link' : 'Share'}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  shareCopied
                    ? 'text-emerald-400 bg-[rgba(52,211,153,0.10)]'
                    : pipeline.shareToken
                      ? 'text-amber-400 hover:text-amber-300 hover:bg-[rgba(245,166,35,0.10)]'
                      : 'text-[rgba(255,255,255,0.4)] hover:text-amber-400 hover:bg-[rgba(245,166,35,0.08)]',
                )}
              >
                {sharePipeline.isPending
                  ? <Loader2 size={12} className="animate-spin" />
                  : shareCopied
                    ? <Check size={12} />
                    : <Link2 size={12} />
                }
              </button>

              {/* Share popover — shown after first-time token generation */}
              <AnimatePresence>
                {sharePopoverOpen && shareUrl && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full right-0 mb-2 w-72 rounded-xl border border-[rgba(255,255,255,0.10)] bg-[#18181b] shadow-xl z-50 p-3"
                  >
                    <p className="text-xs font-medium text-[#fafaf9] mb-1">Share this pipeline</p>
                    <p className="text-[10px] text-[rgba(255,255,255,0.4)] mb-3">
                      Visible to anyone with this link — they&apos;ll need to sign up to run it.
                    </p>
                    <div className="flex items-center gap-1.5 bg-[rgba(255,255,255,0.04)] rounded-lg border border-[rgba(255,255,255,0.07)] px-2.5 py-1.5 mb-2">
                      <span className="flex-1 text-[10px] text-[rgba(255,255,255,0.5)] truncate font-mono">
                        {shareUrl}
                      </span>
                      <button
                        onClick={handleCopyFromPopover}
                        className="flex-shrink-0 text-[rgba(255,255,255,0.4)] hover:text-white transition-colors"
                      >
                        {shareCopied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      </button>
                    </div>
                    <button
                      onClick={handleRevoke}
                      disabled={revokePipelineShare.isPending}
                      className="flex items-center gap-1.5 text-[10px] text-[rgba(255,255,255,0.3)] hover:text-rose-400 transition-colors"
                    >
                      {revokePipelineShare.isPending
                        ? <Loader2 size={10} className="animate-spin" />
                        : <Link2Off size={10} />
                      }
                      Revoke link
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={onEdit}
              aria-label="Edit pipeline"
              title="Edit"
              className="p-1.5 rounded-md text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-colors"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={onDelete}
              aria-label="Delete pipeline"
              title="Delete"
              className="p-1.5 rounded-md text-[rgba(255,255,255,0.4)] hover:text-rose-400 hover:bg-[rgba(244,63,94,0.10)] transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

// ── Builder View ─────────────────────────────────────────────────────────────

interface BuilderViewProps {
  pipelineId?: string
  pipelines: Pipeline[]
  onBack: () => void
  onSaved: (id: string) => void
}

function BuilderView({ pipelineId, pipelines, onBack, onSaved }: BuilderViewProps) {
  const existing = pipelines.find((p) => p.id === pipelineId)

  const [name, setName] = useState(existing?.name ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [steps, setSteps] = useState<DraftStep[]>(() =>
    (existing?.steps ?? []).map((s) => ({
      _key: nextKey(),
      toolId: s.toolId,
      order: s.order,
      inputMapping: s.inputMapping ?? {},
    })),
  )
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const createPipeline = useCreatePipeline()
  const updatePipeline = useUpdatePipeline()

  const selectedIndex = steps.findIndex((s) => s._key === selectedKey)
  const selectedStep = selectedIndex >= 0 ? steps[selectedIndex] : null

  function addTool(toolId: string) {
    const key = nextKey()
    setSteps((prev) => [
      ...prev,
      { _key: key, toolId, order: prev.length + 1, inputMapping: {} },
    ])
    setSelectedKey(key)
  }

  function moveStep(index: number, dir: -1 | 1) {
    setSteps((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function deleteStep(key: string) {
    setSteps((prev) => prev.filter((s) => s._key !== key))
    if (selectedKey === key) setSelectedKey(null)
  }

  function updateMapping(key: string, inputMapping: Record<string, string>) {
    setSteps((prev) =>
      prev.map((s) => (s._key === key ? { ...s, inputMapping } : s)),
    )
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Pipeline name is required')
      return
    }
    setSaving(true)
    try {
      if (pipelineId) {
        await updatePipeline.mutateAsync({
          id: pipelineId,
          data: { name: name.trim(), description: description || undefined, steps: stepsToSave(steps) },
        })
        toast.success('Pipeline updated')
        onSaved(pipelineId)
      } else {
        const res = await createPipeline.mutateAsync({
          name: name.trim(),
          description: description || undefined,
          steps: stepsToSave(steps),
        })
        toast.success(`"${res.pipeline.name}" created`)
        onSaved(res.pipeline.id)
      }
    } catch (e) {
      toast.error((e as Error).message ?? 'Failed to save pipeline')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
        <button
          onClick={onBack}
          className="text-xs text-[rgba(255,255,255,0.4)] hover:text-white transition-colors"
        >
          ← Pipelines
        </button>
        <span className="text-[rgba(255,255,255,0.15)]">/</span>
        <span className="text-xs text-white font-medium">
          {pipelineId ? 'Edit Pipeline' : 'New Pipeline'}
        </span>
        <div className="flex-1" />
        <Button
          variant="primary"
          size="sm"
          loading={saving}
          onClick={handleSave}
        >
          Save Pipeline
        </Button>
      </div>

      {/* Three-panel grid */}
      <div className="flex-1 overflow-hidden grid" style={{ gridTemplateColumns: '240px 1fr 280px' }}>
        {/* Left: Tool Picker */}
        <div className="border-r border-[rgba(255,255,255,0.06)] overflow-hidden">
          <p className="text-[9px] uppercase tracking-widest text-[rgba(255,255,255,0.3)] px-3 pt-3 pb-2">
            Add Tools
          </p>
          <ToolPickerPanel onAdd={addTool} />
        </div>

        {/* Center: Step Canvas */}
        <div className="flex flex-col overflow-hidden">
          {/* Name + description */}
          <div className="px-5 pt-5 pb-3 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Pipeline name..."
              className="w-full bg-transparent text-base font-semibold text-white placeholder:text-[rgba(255,255,255,0.2)] focus:outline-none mb-1"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full bg-transparent text-xs text-[rgba(255,255,255,0.4)] placeholder:text-[rgba(255,255,255,0.2)] focus:outline-none"
            />
          </div>

          {/* Steps */}
          <div className="flex-1 overflow-y-auto scrollbar-none px-5 py-4">
            {steps.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <div className="w-10 h-10 rounded-xl border border-dashed border-[rgba(255,255,255,0.12)] flex items-center justify-center mb-3">
                  <Plus size={16} className="text-[rgba(255,255,255,0.2)]" />
                </div>
                <p className="text-xs text-[rgba(255,255,255,0.3)]">
                  Click a tool on the left to add your first step
                </p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {steps.map((step, idx) => (
                  <div key={step._key}>
                    <StepCard
                      step={step}
                      index={idx}
                      total={steps.length}
                      selected={selectedKey === step._key}
                      onSelect={() =>
                        setSelectedKey(selectedKey === step._key ? null : step._key)
                      }
                      onMoveUp={() => moveStep(idx, -1)}
                      onMoveDown={() => moveStep(idx, 1)}
                      onDelete={() => deleteStep(step._key)}
                    />
                    {idx < steps.length - 1 && <StepArrow />}
                  </div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Right: Step Config */}
        <div className="border-l border-[rgba(255,255,255,0.06)] overflow-hidden">
          <p className="text-[9px] uppercase tracking-widest text-[rgba(255,255,255,0.3)] px-3 pt-3 pb-2">
            Step Config
          </p>
          <StepConfigPanel
            step={selectedStep}
            stepIndex={selectedIndex}
            totalSteps={steps.length}
            onChange={(mapping) => selectedKey && updateMapping(selectedKey, mapping)}
          />
        </div>
      </div>
    </div>
  )
}

// ── Run View ─────────────────────────────────────────────────────────────────

interface RunViewProps {
  pipelineId: string
  pipelines: Pipeline[]
  onBack: () => void
}

type StepStatus = 'waiting' | 'running' | 'complete' | 'failed'

function RunView({ pipelineId, pipelines, onBack }: RunViewProps) {
  const pipeline = pipelines.find((p) => p.id === pipelineId)
  const [initialInput, setInitialInput] = useState('')
  const [result, setResult] = useState<RunResult | null>(null)
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>([])
  const [expandedOutput, setExpandedOutput] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState(false)
  const runPipeline = useRunPipeline()

  const steps = pipeline?.steps ?? []

  function resetRun() {
    setResult(null)
    setStepStatuses([])
    setExpandedOutput({})
  }

  async function handleRun() {
    if (!initialInput.trim()) {
      toast.error('Enter an initial input to start the pipeline')
      return
    }
    resetRun()
    // Optimistic step-by-step animation
    const statuses: StepStatus[] = steps.map(() => 'waiting')
    setStepStatuses([...statuses])

    // Start animation pulse on first step
    if (steps.length > 0) {
      statuses[0] = 'running'
      setStepStatuses([...statuses])
    }

    try {
      const res = await runPipeline.mutateAsync({ id: pipelineId, initialInput: initialInput.trim() })
      // Mark all complete
      const done: StepStatus[] = steps.map(() => 'complete')
      setStepStatuses(done)
      setResult(res)
    } catch (e) {
      // Mark running step as failed
      const failIdx = statuses.findIndex((s) => s === 'running')
      if (failIdx >= 0) statuses[failIdx] = 'failed'
      setStepStatuses([...statuses])
      toast.error((e as Error).message ?? 'Pipeline run failed')
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(result?.finalOutput ?? '').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const isRunning = runPipeline.isPending
  const isDone = !!result
  const hasFailed = stepStatuses.some((s) => s === 'failed')

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-none">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
        <button
          onClick={onBack}
          className="text-xs text-[rgba(255,255,255,0.4)] hover:text-white transition-colors"
        >
          ← Pipelines
        </button>
        <span className="text-[rgba(255,255,255,0.15)]">/</span>
        <span className="text-sm font-semibold text-white">{pipeline?.name}</span>
        <AnimatePresence mode="wait">
          {isRunning && (
            <motion.span
              key="running"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(245,166,35,0.12)] border border-[rgba(245,166,35,0.25)] text-amber-400"
            >
              Running…
            </motion.span>
          )}
          {isDone && !hasFailed && (
            <motion.span
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(52,211,153,0.12)] border border-[rgba(52,211,153,0.25)] text-emerald-400"
            >
              Complete
            </motion.span>
          )}
          {hasFailed && (
            <motion.span
              key="failed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(244,63,94,0.12)] border border-[rgba(244,63,94,0.25)] text-rose-400"
            >
              Failed
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-5 py-5 space-y-5">
        {/* Initial input */}
        <div>
          <label className="text-xs text-[rgba(255,255,255,0.5)] block mb-1.5">Initial Input</label>
          <textarea
            value={initialInput}
            onChange={(e) => setInitialInput(e.target.value)}
            placeholder="Enter the input to feed into the first step…"
            rows={4}
            className="w-full px-3 py-2.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-sm text-white placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[rgba(245,166,35,0.35)] resize-none"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="primary"
            size="md"
            loading={isRunning}
            disabled={!initialInput.trim()}
            onClick={handleRun}
          >
            <Play size={13} />
            Run Pipeline
          </Button>
          {(isDone || hasFailed) && (
            <Button variant="secondary" size="md" onClick={() => { resetRun(); setInitialInput('') }}>
              Run Again
            </Button>
          )}
        </div>

        {/* Steps status */}
        {steps.length > 0 && stepStatuses.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-[rgba(255,255,255,0.3)]">Steps</p>
            {steps.map((step, idx) => {
              const status = stepStatuses[idx] ?? 'waiting'
              const color = categoryColor(step.toolId)
              const stepOutput = result?.stepOutputs?.[step.id] ?? result?.stepOutputs?.[String(idx)]
              const isExpanded = expandedOutput[step.id]

              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={cn(
                    'rounded-lg border border-l-[3px] overflow-hidden',
                    status === 'waiting' && 'border-[rgba(255,255,255,0.07)] opacity-50',
                    status === 'running' && 'border-[rgba(245,166,35,0.25)] animate-pulse-amber',
                    status === 'complete' && 'border-[rgba(52,211,153,0.2)]',
                    status === 'failed' && 'border-[rgba(244,63,94,0.2)]',
                  )}
                  style={{ borderLeftColor: status === 'waiting' ? 'rgba(255,255,255,0.15)' : color }}
                >
                  <div className="flex items-center gap-2.5 px-3 py-2.5">
                    <span className="text-[10px] text-[rgba(255,255,255,0.3)] w-4 tabular-nums">
                      {idx + 1}
                    </span>
                    <span className="text-sm leading-none">{TOOL_CONFIGS[step.toolId]?.icon ?? '⚙️'}</span>
                    <span className="flex-1 text-xs font-medium text-white">{toolName(step.toolId)}</span>
                    {/* Status icon */}
                    {status === 'waiting' && <div className="w-3 h-3 rounded-full bg-[rgba(255,255,255,0.15)]" />}
                    {status === 'running' && <Loader2 size={13} className="animate-spin text-amber-400" />}
                    {status === 'complete' && <CheckCircle2 size={13} className="text-emerald-400" />}
                    {status === 'failed' && <XCircle size={13} className="text-rose-400" />}
                  </div>

                  {/* Step output preview */}
                  {status === 'complete' && stepOutput && (
                    <div className="px-3 pb-2.5 border-t border-[rgba(255,255,255,0.05)]">
                      <button
                        onClick={() => setExpandedOutput((v) => ({ ...v, [step.id]: !v[step.id] }))}
                        className="text-[10px] text-[rgba(255,255,255,0.35)] hover:text-white transition-colors mt-1.5"
                      >
                        {isExpanded ? '▲ Collapse' : '▼ Show output'}
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.pre
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden text-[11px] text-[rgba(255,255,255,0.55)] font-mono mt-1 whitespace-pre-wrap break-words leading-relaxed"
                          >
                            {stepOutput.slice(0, 200)}
                            {stepOutput.length > 200 ? '…' : ''}
                          </motion.pre>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Final output */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-[rgba(52,211,153,0.2)] bg-[rgba(52,211,153,0.04)] overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(52,211,153,0.1)]">
                <span className="text-xs font-semibold text-emerald-400">Final Output</span>
                <div className="flex items-center gap-2">
                  {result.durationMs && (
                    <span className="text-[10px] text-[rgba(255,255,255,0.3)]">
                      {result.durationMs < 1000
                        ? `${result.durationMs}ms`
                        : `${(result.durationMs / 1000).toFixed(1)}s`}
                    </span>
                  )}
                  <button
                    onClick={handleCopy}
                    aria-label="Copy output"
                    className="p-1.5 rounded-md text-[rgba(255,255,255,0.3)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                  >
                    {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
              <pre className="p-4 text-sm text-[rgba(255,255,255,0.8)] font-mono whitespace-pre-wrap break-words leading-relaxed max-h-96 overflow-y-auto scrollbar-none">
                {result.finalOutput}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── List View ─────────────────────────────────────────────────────────────────

interface ListViewProps {
  onNewPipeline: () => void
  onEdit: (id: string) => void
  onRun: (id: string) => void
}

const TEMPLATE_CATEGORY_COLORS: Record<PipelineTemplate['category'], { color: string; bg: string }> = {
  Developer: { color: '#34d399', bg: 'rgba(52,211,153,0.08)' },
  Planning:  { color: '#38bdf8', bg: 'rgba(56,189,248,0.08)' },
  Prompting: { color: '#F5A623', bg: 'rgba(245,166,35,0.08)' },
  Workplace: { color: '#fb923c', bg: 'rgba(251,146,60,0.08)' },
}

function ListView({ onNewPipeline, onEdit, onRun }: ListViewProps) {
  const { data: pipelines, isLoading, error } = usePipelines()
  const deletePipeline = useDeletePipeline()
  const createPipeline = useCreatePipeline()
  const [importingTemplateId, setImportingTemplateId] = useState<string | null>(null)

  async function handleDelete(id: string, name: string) {
    try {
      await deletePipeline.mutateAsync(id)
      toast.success(`"${name}" deleted`)
    } catch {
      toast.error('Failed to delete pipeline')
    }
  }

  async function handleImportTemplate(template: PipelineTemplate) {
    if (importingTemplateId) return
    setImportingTemplateId(template.id)
    try {
      await createPipeline.mutateAsync({
        name: template.name,
        description: template.description,
        steps: template.steps.map((s) => ({
          toolId: s.toolId,
          order: s.order,
          inputMapping: s.inputMapping,
        })),
      })
      toast.success(`"${template.name}" added to your pipelines`)
    } catch {
      toast.error('Could not import template')
    } finally {
      setImportingTemplateId(null)
    }
  }

  if (error) return <ErrorAlert message="Failed to load pipelines" />

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <GitBranch size={16} className="text-[#F5A623]" />
            <h1 className="text-lg font-semibold text-white">Pipelines</h1>
          </div>
          <p className="text-xs text-[rgba(255,255,255,0.4)]">
            Chain tools together into automated workflows
          </p>
        </div>
        <Button size="sm" variant="primary" onClick={onNewPipeline}>
          <Plus size={13} />
          New Pipeline
        </Button>
      </div>

      {/* Templates section — always visible, visually distinct from owned pipelines */}
      <section>
        <p className="text-xs font-medium text-[rgba(255,255,255,0.35)] uppercase tracking-wider mb-3">
          Start from a template
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PIPELINE_TEMPLATES.map((template) => {
            const isImporting = importingTemplateId === template.id
            const cat = TEMPLATE_CATEGORY_COLORS[template.category]
            return (
              <div
                key={template.id}
                className="p-3.5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] flex flex-col gap-2.5"
              >
                <div>
                  <span
                    className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded mb-1.5 inline-block"
                    style={{ color: cat.color, backgroundColor: cat.bg }}
                  >
                    {template.category}
                  </span>
                  <p className="text-xs font-semibold text-white">{template.name}</p>
                  <p className="text-[10px] text-[rgba(255,255,255,0.4)] mt-0.5 leading-relaxed">{template.description}</p>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {template.toolIds.map((toolId, i) => (
                    <span key={toolId} className="flex items-center gap-1">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.06)]">
                        {TOOL_CONFIGS[toolId]?.name ?? toolId}
                      </span>
                      {i < template.toolIds.length - 1 && (
                        <ArrowRight size={8} className="text-[rgba(255,255,255,0.2)]" />
                      )}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => handleImportTemplate(template)}
                  disabled={!!importingTemplateId}
                  className={cn(
                    'flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-[10px] font-semibold',
                    'border transition-colors duration-150',
                    isImporting
                      ? 'border-[rgba(255,255,255,0.08)] text-ink-dim cursor-wait'
                      : 'border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.5)] hover:text-white hover:border-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.04)]',
                  )}
                >
                  {isImporting
                    ? <><Loader2 size={10} className="animate-spin" />Importing…</>
                    : <><Workflow size={10} />Use template</>
                  }
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {/* Owned pipelines */}
      <section>
        <p className="text-xs font-medium text-[rgba(255,255,255,0.35)] uppercase tracking-wider mb-3">
          Your pipelines
        </p>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-36 rounded-xl bg-[rgba(255,255,255,0.03)] animate-pulse border border-[rgba(255,255,255,0.06)]"
              />
            ))}
          </div>
        ) : pipelines?.length === 0 ? (
          <p className="text-xs text-[rgba(255,255,255,0.3)] py-2">
            No pipelines yet — import a template above or{' '}
            <button onClick={onNewPipeline} className="underline hover:text-white transition-colors">
              build one from scratch
            </button>.
          </p>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          >
            {pipelines?.map((pipeline) => (
              <PipelineCard
                key={pipeline.id}
                pipeline={pipeline}
                onEdit={() => onEdit(pipeline.id)}
                onRun={() => onRun(pipeline.id)}
                onDelete={() => handleDelete(pipeline.id, pipeline.name)}
              />
            ))}

            {/* New pipeline dashed card */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
            >
              <button
                onClick={onNewPipeline}
                className="w-full h-full min-h-[120px] rounded-xl border border-dashed border-[rgba(255,255,255,0.10)] flex flex-col items-center justify-center gap-2 text-xs text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.6)] hover:border-[rgba(255,255,255,0.2)] transition-colors"
              >
                <Plus size={16} />
                New Pipeline
              </button>
            </motion.div>
          </motion.div>
        )}
      </section>
    </div>
  )
}

// ── Page root ─────────────────────────────────────────────────────────────────

export default function PipelinesPage() {
  const { data: pipelines = [] } = usePipelines()
  const [view, setView] = useState<View>({ type: 'list' })

  const goList = useCallback(() => setView({ type: 'list' }), [])
  const goBuilder = useCallback(
    (pipelineId?: string) => setView({ type: 'builder', pipelineId }),
    [],
  )
  const goRun = useCallback(
    (pipelineId: string) => setView({ type: 'run', pipelineId }),
    [],
  )

  return (
    <div
      className={cn(
        'h-full',
        view.type !== 'list' && 'flex flex-col',
      )}
    >
      <AnimatePresence mode="wait">
        {view.type === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            <ListView
              onNewPipeline={() => goBuilder()}
              onEdit={(id) => goBuilder(id)}
              onRun={(id) => goRun(id)}
            />
          </motion.div>
        )}

        {view.type === 'builder' && (
          <motion.div
            key="builder"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <BuilderView
              pipelineId={view.pipelineId}
              pipelines={pipelines}
              onBack={goList}
              onSaved={goList}
            />
          </motion.div>
        )}

        {view.type === 'run' && (
          <motion.div
            key="run"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <RunView
              pipelineId={view.pipelineId}
              pipelines={pipelines}
              onBack={goList}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
