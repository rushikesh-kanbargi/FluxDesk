'use client'

import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Send } from 'lucide-react'
import { Button, Input, Textarea, Select, cn } from '@/components/ui/index'
import type { ToolConfig, ToolField } from './configs'

interface InputPanelProps {
  config: ToolConfig
  onSubmit: (values: Record<string, unknown>) => void
  isRunning: boolean
  serverFieldErrors?: Record<string, string> | null
}

function buildSchema(fields: ToolField[]) {
  const shape: Record<string, z.ZodTypeAny> = {}
  fields.forEach((f) => {
    shape[f.id] = f.required
      ? z.string().min(1, `${f.label} is required`)
      : z.string().optional()
  })
  return z.object(shape)
}

export function InputPanel({ config, onSubmit, isRunning, serverFieldErrors }: InputPanelProps) {
  const schema = buildSchema(config.fields)
  const formRef = useRef<HTMLFormElement>(null)
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: Object.fromEntries(config.fields.map((f) => [f.id, ''])),
  })

  // Cmd+Enter / Ctrl+Enter triggers form submit
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !isRunning) {
        e.preventDefault()
        formRef.current?.requestSubmit()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isRunning])

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-3 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between">
        <span className="text-xs font-medium text-ink-dim uppercase tracking-wider">Input</span>
      </div>

      <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col gap-0">
        <div className="flex-1 px-5 py-4 space-y-4 overflow-auto">
          {config.fields.map((field, i) => (
            <motion.div
              key={field.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <FieldRenderer
                field={field}
                register={register}
                setValue={setValue}
                watch={watch}
                error={(errors[field.id]?.message as string | undefined) ?? serverFieldErrors?.[field.id]}
                disabled={isRunning}
              />
            </motion.div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-[rgba(255,255,255,0.06)] flex-shrink-0">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isRunning}
            className="w-full gap-2"
            disabled={isRunning}
          >
            {!isRunning && <Send size={14} />}
            {isRunning ? 'Generating...' : 'Generate'}
          </Button>
          <p className="text-center text-[10px] text-ink-dim mt-2">
            <kbd className="px-1 py-0.5 bg-[rgba(255,255,255,0.06)] rounded text-[9px] border border-[rgba(255,255,255,0.06)]">
              ⌘↵
            </kbd>{' '}
            to run
          </p>
        </div>
      </form>
    </div>
  )
}

// Separate type for the register/setValue/watch props
type UseFormRegister = ReturnType<typeof useForm>['register']
type UseFormSetValue = ReturnType<typeof useForm>['setValue']
type UseFormWatch    = ReturnType<typeof useForm>['watch']

function FieldRenderer({
  field,
  register,
  setValue,
  watch,
  error,
  disabled,
}: {
  field: ToolField
  register: UseFormRegister
  setValue: UseFormSetValue
  watch: UseFormWatch
  error?: string
  disabled: boolean
}) {
  const value = watch(field.id)

  if (field.type === 'select') {
    return (
      <Select
        label={field.label}
        options={field.options ?? []}
        value={(value as string) || ''}
        onValueChange={(v) => setValue(field.id, v)}
        placeholder="Select..."
        disabled={disabled}
      />
    )
  }

  if (field.type === 'code') {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-ink-muted">
          {field.label}
          {field.required && <span className="text-amber ml-1">*</span>}
        </label>
        <textarea
          {...register(field.id)}
          rows={field.rows ?? 8}
          placeholder={field.placeholder}
          disabled={disabled}
          className={cn(
            'w-full bg-[#0a0a0c] border border-[rgba(255,255,255,0.08)] rounded-md',
            'px-3 py-2.5 text-sm text-ink placeholder:text-ink-dim resize-y',
            'font-mono transition-colors duration-150',
            'hover:border-[rgba(255,255,255,0.12)]',
            'focus:outline-none focus:border-[rgba(245,166,35,0.4)]',
            'disabled:opacity-40',
            error && 'border-[rgba(244,63,94,0.4)]',
          )}
        />
        {error && <p className="text-xs text-rose">{error}</p>}
      </div>
    )
  }

  if (field.type === 'textarea') {
    return (
      <Textarea
        label={field.label}
        required={field.required}
        rows={field.rows ?? 4}
        placeholder={field.placeholder}
        error={error}
        disabled={disabled}
        {...register(field.id)}
      />
    )
  }

  // Default: input
  return (
    <Input
      label={field.label}
      required={field.required}
      placeholder={field.placeholder}
      error={error}
      disabled={disabled}
      {...register(field.id)}
    />
  )
}
