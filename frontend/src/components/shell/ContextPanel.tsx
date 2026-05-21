'use client'

import { useState, useCallback, useEffect } from 'react'
import { Info, Sparkles } from 'lucide-react'
import { Tooltip } from '@/components/ui'
import { useMemory, useUpdateMemory } from '@/hooks/useMemory'
import { cn } from '@/components/ui'

// ── Field-level tooltip labels — specific, not generic ──────────
const FIELD_TIPS = {
  role:    'Shapes the tone and depth of every tool output — senior engineer vs. junior changes everything.',
  domain:  'Helps FluxDesk tailor examples and context to your industry or problem space.',
  style:   'Influences how outputs are phrased — direct vs. exploratory, formal vs. casual.',
  stack:   'Auto-detected from your inputs — tool outputs reference your actual stack, not generic examples.',
  tools:   'Drives smart suggestions and personalised tool ordering as you use FluxDesk more.',
}

const STYLE_OPTIONS: { value: 'concise' | 'detailed' | 'bullet-heavy'; label: string }[] = [
  { value: 'concise',      label: 'Concise' },
  { value: 'detailed',     label: 'Thorough' },
  { value: 'bullet-heavy', label: 'Structured' },
]

type EditableField = 'inferredRole' | 'inferredDomain' | 'writingStyle'

// ── Section header ──────────────────────────────────────────────
function SectionLabel({ children, tip }: { children: React.ReactNode; tip: string }) {
  return (
    <div className="flex items-center gap-1 px-4 pt-3 pb-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(255,255,255,0.25)]">
        {children}
      </span>
      <Tooltip content={tip} side="right">
        <Info size={10} className="text-[rgba(255,255,255,0.2)] hover:text-[rgba(255,255,255,0.4)] cursor-default flex-shrink-0" />
      </Tooltip>
    </div>
  )
}

// ── Inline text field ──────────────────────────────────────────
interface InlineFieldProps {
  label: string
  tip: string
  value: string
  placeholder: string
  onSave: (value: string) => Promise<void>
  error?: string
  onRetry: () => void
}

function InlineField({ label, tip, value: initialValue, placeholder, onSave, error, onRetry }: InlineFieldProps) {
  const [localValue, setLocalValue] = useState(initialValue)
  const [isEditing, setIsEditing] = useState(false)

  // Sync from parent when optimistic rollback fires — but only if user isn't typing
  useEffect(() => {
    if (!isEditing) setLocalValue(initialValue)
  }, [initialValue, isEditing])

  const handleBlur = useCallback(async () => {
    setIsEditing(false)
    if (localValue !== initialValue) await onSave(localValue)
  }, [localValue, initialValue, onSave])

  return (
    <div className="px-4 py-1">
      <div className="flex items-center gap-1 mb-0.5">
        <span className="text-[10px] text-[rgba(255,255,255,0.35)]">{label}</span>
        <Tooltip content={tip} side="right">
          <Info size={9} className="text-[rgba(255,255,255,0.18)] hover:text-[rgba(255,255,255,0.35)] cursor-default" />
        </Tooltip>
      </div>
      <input
        type="text"
        value={localValue}
        placeholder={placeholder}
        onChange={(e) => setLocalValue(e.target.value)}
        onFocus={() => setIsEditing(true)}
        onBlur={handleBlur}
        className={cn(
          'w-full bg-transparent text-xs text-white placeholder-[rgba(255,255,255,0.2)]',
          'border-b border-[rgba(255,255,255,0.08)] focus:border-[rgba(245,166,35,0.4)] outline-none',
          'py-0.5 transition-colors duration-150',
        )}
      />
      {error && (
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-red-400">{error}</span>
          <button onClick={onRetry} className="text-[10px] text-amber-400 hover:text-amber-300 underline">
            Retry
          </button>
        </div>
      )}
    </div>
  )
}

// ── Writing style segmented control ────────────────────────────
interface StylePickerProps {
  value: string | undefined
  onSelect: (v: 'concise' | 'detailed' | 'bullet-heavy') => Promise<void>
  error?: string
  onRetry: () => void
}

function StylePicker({ value, onSelect, error, onRetry }: StylePickerProps) {
  return (
    <div className="px-4 py-1">
      <div className="flex items-center gap-1 mb-1">
        <span className="text-[10px] text-[rgba(255,255,255,0.35)]">Writing style</span>
        <Tooltip content={FIELD_TIPS.style} side="right">
          <Info size={9} className="text-[rgba(255,255,255,0.18)] hover:text-[rgba(255,255,255,0.35)] cursor-default" />
        </Tooltip>
      </div>
      <div className="flex rounded-md overflow-hidden border border-[rgba(255,255,255,0.08)]">
        {STYLE_OPTIONS.map((opt) => {
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value)}
              className={cn(
                'flex-1 text-[10px] py-1 transition-colors duration-150',
                active
                  ? 'bg-[rgba(245,166,35,0.15)] text-[#F5A623] font-medium'
                  : 'text-[rgba(255,255,255,0.35)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]',
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      {error && (
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-red-400">{error}</span>
          <button onClick={onRetry} className="text-[10px] text-amber-400 hover:text-amber-300 underline">
            Retry
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────
export function ContextPanel() {
  const { data: memory, isLoading } = useMemory()
  const updateMemory = useUpdateMemory()
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<EditableField, string>>>({})
  const [lastPayload, setLastPayload] = useState<Partial<Record<EditableField, string>>>({})

  const saveField = useCallback(async (field: EditableField, value: string) => {
    const payload = { [field]: value || undefined }
    setLastPayload((p) => ({ ...p, [field]: value }))
    setFieldErrors((e) => ({ ...e, [field]: undefined }))
    try {
      await updateMemory.mutateAsync(payload)
    } catch {
      setFieldErrors((e) => ({ ...e, [field]: 'Save failed' }))
    }
  }, [updateMemory])

  const retryField = useCallback((field: EditableField) => {
    const value = lastPayload[field] ?? ''
    saveField(field, value)
  }, [lastPayload, saveField])

  if (isLoading) {
    return (
      <div className="px-4 py-4 space-y-2">
        {[80, 60, 70, 50].map((w, i) => (
          <div key={i} className="h-2 rounded bg-[rgba(255,255,255,0.06)] animate-pulse" style={{ width: `${w}%` }} />
        ))}
      </div>
    )
  }

  const inferredStack = memory?.inferredStack ?? []
  const topTools = memory?.topTools ?? []
  const memoryNotes = memory?.memoryNotes ?? []
  const isEmpty = inferredStack.length === 0 && topTools.length === 0

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-none">

      {/* Editable overrides — always visible, even on day one */}
      <SectionLabel tip="These fields shape every tool output. Edit anytime.">
        Your profile
      </SectionLabel>

      <InlineField
        label="Role"
        tip={FIELD_TIPS.role}
        value={memory?.inferredRole ?? ''}
        placeholder="e.g. Senior backend engineer"
        onSave={(v) => saveField('inferredRole', v)}
        error={fieldErrors.inferredRole}
        onRetry={() => retryField('inferredRole')}
      />

      <InlineField
        label="Domain"
        tip={FIELD_TIPS.domain}
        value={memory?.inferredDomain ?? ''}
        placeholder="e.g. Fintech, DevTools, Healthcare"
        onSave={(v) => saveField('inferredDomain', v)}
        error={fieldErrors.inferredDomain}
        onRetry={() => retryField('inferredDomain')}
      />

      <StylePicker
        value={memory?.writingStyle}
        onSelect={(v) => saveField('writingStyle', v)}
        error={fieldErrors.writingStyle}
        onRetry={() => retryField('writingStyle')}
      />

      {/* Hero state — shown when no inferred data yet */}
      {isEmpty ? (
        <div className="mx-4 mt-4 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles size={12} className="text-[rgba(245,166,35,0.5)]" />
            <span className="text-[11px] font-medium text-[rgba(255,255,255,0.5)]">FluxDesk learns as you work.</span>
          </div>
          <p className="text-[10px] text-[rgba(255,255,255,0.3)] leading-relaxed">
            After a few tool runs, your inferred stack and top tools appear here — shaping every output automatically.
          </p>
        </div>
      ) : (
        <>
          {/* Tech Stack */}
          {inferredStack.length > 0 && (
            <>
              <SectionLabel tip={FIELD_TIPS.stack}>Tech stack</SectionLabel>
              <div className="px-4 pb-1 flex flex-wrap gap-1">
                {inferredStack.map((tech) => (
                  <span
                    key={tech}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.55)] border border-[rgba(255,255,255,0.08)]"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </>
          )}

          {/* Top Tools */}
          {topTools.length > 0 && (
            <>
              <SectionLabel tip={FIELD_TIPS.tools}>Top tools</SectionLabel>
              <div className="px-4 pb-1 space-y-0.5">
                {topTools.slice(0, 5).map((toolId) => (
                  <div key={toolId} className="text-[11px] text-[rgba(255,255,255,0.45)] capitalize">
                    {toolId.replace(/-/g, ' ')}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Memory Notes */}
          {memoryNotes.length > 0 && (
            <>
              <SectionLabel tip="System-detected context notes from your tool usage.">
                Notes
              </SectionLabel>
              <div className="px-4 pb-2 space-y-1">
                {memoryNotes.slice(-3).map((note, i) => (
                  <p key={i} className="text-[10px] text-[rgba(255,255,255,0.3)] leading-relaxed">
                    {note}
                  </p>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
