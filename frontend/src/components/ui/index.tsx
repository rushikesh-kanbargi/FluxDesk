'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import * as SelectPrimitive from '@radix-ui/react-select'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { AlertTriangle, Check, ChevronDown, X } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ── Utils ──────────────────────────────────────────────────────
export function cn(...inputs: (string | undefined | null | boolean)[]) {
  return twMerge(clsx(inputs))
}

// ── Button ─────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'amber'
type ButtonSize    = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children: React.ReactNode
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary:   'bg-amber text-[#09090b] font-semibold border border-transparent hover:bg-amber-hover',
  secondary: 'bg-transparent border border-[rgba(255,255,255,0.10)] text-ink hover:border-[rgba(255,255,255,0.16)] hover:bg-[rgba(255,255,255,0.04)]',
  ghost:     'bg-transparent border border-transparent text-ink-muted hover:text-ink hover:bg-[rgba(255,255,255,0.04)]',
  danger:    'bg-transparent border border-[rgba(244,63,94,0.25)] text-rose hover:bg-[rgba(244,63,94,0.10)]',
  amber:     'bg-[rgba(245,166,35,0.10)] border border-[rgba(245,166,35,0.25)] text-amber hover:bg-[rgba(245,166,35,0.16)]',
}

const buttonSizes: Record<ButtonSize, string> = {
  sm:   'h-7 px-3 text-xs gap-1.5',
  md:   'h-9 px-4 text-sm gap-2',
  lg:   'h-10 px-5 text-sm gap-2',
  icon: 'h-9 w-9 p-0',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', loading, disabled, className, children, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        disabled={disabled || loading}
        className={cn(
          'relative inline-flex items-center justify-center rounded-md font-medium',
          'transition-colors duration-150 cursor-pointer select-none',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/50',
          buttonVariants[variant],
          buttonSizes[size],
          className,
        )}
        {...(props as any)}
      >
        {loading ? (
          <>
            <span className="opacity-0">{children}</span>
            <span className="absolute inset-0 flex items-center justify-center">
              <LoadingSpinner size={14} />
            </span>
          </>
        ) : children}
      </motion.button>
    )
  }
)
Button.displayName = 'Button'

// ── Loading Spinner ────────────────────────────────────────────
export function LoadingSpinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('animate-spin', className)}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// ── Input ──────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, className, id, ...props }, ref) => {
    const generatedId = React.useId()
    const inputId = id || generatedId
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-ink-muted">
            {label}
            {props.required && <span className="text-amber ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full h-9 bg-[#111113] border border-[rgba(255,255,255,0.08)] rounded-md',
              'px-3 text-sm text-ink placeholder:text-ink-dim',
              'transition-colors duration-150',
              'hover:border-[rgba(255,255,255,0.12)]',
              'focus:outline-none focus:border-[rgba(245,166,35,0.4)] focus:bg-[#18181b]',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              !!icon && 'pl-9',
              error && 'border-[rgba(244,63,94,0.4)] focus:border-rose',
              className,
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-rose">{error}</p>}
        {hint && !error && <p className="text-xs text-ink-dim">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

// ── Textarea ───────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const generatedId = React.useId()
    const textareaId = id || generatedId
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-xs font-medium text-ink-muted">
            {label}
            {props.required && <span className="text-amber ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'w-full min-h-[80px] bg-[#111113] border border-[rgba(255,255,255,0.08)] rounded-md',
            'px-3 py-2.5 text-sm text-ink placeholder:text-ink-dim font-sans',
            'resize-y transition-colors duration-150',
            'hover:border-[rgba(255,255,255,0.12)]',
            'focus:outline-none focus:border-[rgba(245,166,35,0.4)] focus:bg-[#18181b]',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            error && 'border-[rgba(244,63,94,0.4)]',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-rose">{error}</p>}
        {hint && !error && <p className="text-xs text-ink-dim">{hint}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

// ── Badge ──────────────────────────────────────────────────────
type BadgeVariant = 'default' | 'amber' | 'emerald' | 'rose' | 'sky' | 'violet' | 'orange' | 'outline'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
  dot?: boolean
}

const badgeVariants: Record<BadgeVariant, string> = {
  default:  'bg-[rgba(255,255,255,0.06)] text-ink-muted border border-[rgba(255,255,255,0.08)]',
  amber:    'bg-[rgba(245,166,35,0.10)] text-amber border border-[rgba(245,166,35,0.25)]',
  emerald:  'bg-[rgba(52,211,153,0.12)] text-emerald border border-[rgba(52,211,153,0.25)]',
  rose:     'bg-[rgba(244,63,94,0.12)] text-rose border border-[rgba(244,63,94,0.25)]',
  sky:      'bg-[rgba(56,189,248,0.12)] text-sky border border-[rgba(56,189,248,0.25)]',
  violet:   'bg-[rgba(167,139,250,0.12)] text-violet border border-[rgba(167,139,250,0.25)]',
  orange:   'bg-[rgba(251,146,60,0.12)] text-orange border border-[rgba(251,146,60,0.25)]',
  outline:  'bg-transparent text-ink-muted border border-[rgba(255,255,255,0.10)]',
}

export function Badge({ variant = 'default', children, className, dot }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
      badgeVariants[variant],
      className,
    )}>
      {dot && (
        <span className={cn(
          'w-1.5 h-1.5 rounded-full',
          variant === 'emerald' ? 'bg-emerald animate-pulse-amber' :
          variant === 'amber'   ? 'bg-amber' :
          variant === 'rose'    ? 'bg-rose' : 'bg-current',
        )} />
      )}
      {children}
    </span>
  )
}

// ── Card ───────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const cardPadding = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-5' }

export function Card({ children, className, hover, onClick, padding = 'md' }: CardProps) {
  const Component = onClick ? motion.div : 'div'
  const motionProps = onClick ? {
    whileHover: { borderColor: 'rgba(255,255,255,0.12)' },
    whileTap:   { scale: 0.99 },
    transition: { type: 'spring' as const, stiffness: 300, damping: 30 },
  } : {}

  return (
    <Component
      className={cn(
        'bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl',
        'transition-colors duration-150',
        hover && 'hover:border-[rgba(255,255,255,0.10)] hover:bg-[#18181b]',
        onClick && 'cursor-pointer',
        cardPadding[padding],
        className,
      )}
      onClick={onClick}
      {...motionProps}
    >
      {children}
    </Component>
  )
}

// ── Skeleton ───────────────────────────────────────────────────
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('skeleton rounded-md', className)}
      {...props}
    />
  )
}

// ── Select ─────────────────────────────────────────────────────
interface SelectOption { value: string; label: string }
interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  label?: string
  className?: string
  disabled?: boolean
}

export function Select({ value, onValueChange, options, placeholder, label, className, disabled }: SelectProps) {
  const id = React.useId()
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={id} className="text-xs font-medium text-ink-muted">{label}</label>}
      <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectPrimitive.Trigger
          id={id}
          className={cn(
            'flex items-center justify-between w-full h-9 px-3',
            'bg-[#111113] border border-[rgba(255,255,255,0.08)] rounded-md',
            'text-sm text-ink',
            'hover:border-[rgba(255,255,255,0.12)] transition-colors duration-150',
            'focus:outline-none focus:border-[rgba(245,166,35,0.4)]',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            '[&[data-placeholder]]:text-ink-dim',
            className,
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon>
            <ChevronDown size={14} className="text-ink-dim" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            className={cn(
              'z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden',
              'bg-[#1f1f23] border border-[rgba(255,255,255,0.10)] rounded-xl',
              'shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
              'data-[state=open]:animate-scale-in',
            )}
          >
            <SelectPrimitive.Viewport className="p-1">
              {options.map(opt => (
                <SelectPrimitive.Item
                  key={opt.value}
                  value={opt.value}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-md text-sm text-ink',
                    'cursor-pointer select-none outline-none',
                    'hover:bg-[rgba(255,255,255,0.06)] data-[highlighted]:bg-[rgba(255,255,255,0.06)]',
                    'data-[state=checked]:text-amber',
                    'transition-colors duration-100',
                  )}
                >
                  <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator>
                    <Check size={12} className="text-amber" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  )
}

// ── Tabs ───────────────────────────────────────────────────────
export const Tabs        = TabsPrimitive.Root
export const TabsList    = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'flex items-center gap-0.5 p-1 bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-lg',
      className,
    )}
    {...props}
  />
))
TabsList.displayName = 'TabsList'

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-ink-muted',
      'transition-all duration-150 cursor-pointer select-none outline-none',
      'hover:text-ink hover:bg-[rgba(255,255,255,0.04)]',
      'data-[state=active]:bg-[rgba(245,166,35,0.10)] data-[state=active]:text-amber',
      'data-[state=active]:border data-[state=active]:border-[rgba(245,166,35,0.2)]',
      className,
    )}
    {...props}
  />
))
TabsTrigger.displayName = 'TabsTrigger'

export const TabsContent = TabsPrimitive.Content

// ── Tooltip ────────────────────────────────────────────────────
interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

export function Tooltip({ content, children, side = 'top', delay = 300 }: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={delay}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            className={cn(
              'z-50 px-2.5 py-1.5 rounded-md text-xs text-ink',
              'bg-[#26262a] border border-[rgba(255,255,255,0.10)]',
              'shadow-[0_4px_16px_rgba(0,0,0,0.4)]',
              'animate-fade-in',
            )}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-[#26262a]" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}

// ── Dialog / Modal ─────────────────────────────────────────────
export const Dialog        = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose   = DialogPrimitive.Close

interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  title?: string
  description?: string
  hideClose?: boolean
}

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, title, description, hideClose, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-[rgba(0,0,0,0.7)] backdrop-blur-sm animate-fade-in" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
        'w-full max-w-lg bg-[#1f1f23] border border-[rgba(255,255,255,0.10)] rounded-2xl',
        'shadow-[0_24px_64px_rgba(0,0,0,0.6)]',
        'animate-scale-in',
        'focus:outline-none',
        className,
      )}
      {...props}
    >
      {(title || !hideClose) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
          {title && (
            <div>
              <DialogPrimitive.Title className="text-sm font-semibold text-ink">{title}</DialogPrimitive.Title>
              {description && <DialogPrimitive.Description className="text-xs text-ink-muted mt-0.5">{description}</DialogPrimitive.Description>}
            </div>
          )}
          {!hideClose && (
            <DialogPrimitive.Close className="p-1.5 rounded-md text-ink-dim hover:text-ink hover:bg-[rgba(255,255,255,0.06)] transition-colors">
              <X size={14} />
            </DialogPrimitive.Close>
          )}
        </div>
      )}
      <div className="p-5">{children}</div>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
DialogContent.displayName = 'DialogContent'

// ── Dropdown Menu ──────────────────────────────────────────────
export const DropdownMenu        = DropdownPrimitive.Root
export const DropdownMenuTrigger = DropdownPrimitive.Trigger

interface DropdownMenuContentProps extends React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Content> {}

export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Content>,
  DropdownMenuContentProps
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownPrimitive.Portal>
    <DropdownPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-[160px] p-1 rounded-xl overflow-hidden',
        'bg-[#1f1f23] border border-[rgba(255,255,255,0.10)]',
        'shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
        'animate-scale-in',
        className,
      )}
      {...props}
    />
  </DropdownPrimitive.Portal>
))
DropdownMenuContent.displayName = 'DropdownMenuContent'

export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Item> & { danger?: boolean }
>(({ className, danger, ...props }, ref) => (
  <DropdownPrimitive.Item
    ref={ref}
    className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer outline-none',
      'transition-colors duration-100 select-none',
      danger
        ? 'text-rose hover:bg-[rgba(244,63,94,0.10)]'
        : 'text-ink hover:bg-[rgba(255,255,255,0.06)]',
      'data-[highlighted]:bg-[rgba(255,255,255,0.06)]',
      className,
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = 'DropdownMenuItem'

export const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownPrimitive.Separator
    ref={ref}
    className={cn('my-1 h-px bg-[rgba(255,255,255,0.06)]', className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator'

// ── Animated Counter ───────────────────────────────────────────
interface AnimatedCounterProps {
  value: number
  duration?: number
  className?: string
  prefix?: string
  suffix?: string
}

export function AnimatedCounter({ value, duration = 1000, className, prefix, suffix }: AnimatedCounterProps) {
  const [display, setDisplay] = React.useState(0)
  const [hasAnimated, setHasAnimated] = React.useState(false)
  const ref = React.useRef<HTMLSpanElement>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true)
          const start = Date.now()
          const tick = () => {
            const elapsed = Date.now() - start
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setDisplay(Math.round(eased * value))
            if (progress < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [value, duration, hasAnimated])

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {prefix}{display.toLocaleString()}{suffix}
    </span>
  )
}

// ── Progress Bar ───────────────────────────────────────────────
interface ProgressBarProps {
  value: number // 0-100
  className?: string
  animated?: boolean
  color?: string
}

export function ProgressBar({ value, className, animated, color = '#F5A623' }: ProgressBarProps) {
  return (
    <div className={cn('h-1 w-full bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden', className)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(value, 100)}%` }}
        transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.1 }}
        className="h-full rounded-full"
        style={{ backgroundColor: animated ? undefined : color }}
      >
        {animated && (
          <div className="h-full w-full progress-bar" />
        )}
      </motion.div>
    </div>
  )
}

// ── Divider ────────────────────────────────────────────────────
export function Divider({ label, className }: { label?: string; className?: string }) {
  if (label) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
        <span className="text-xs text-ink-dim">{label}</span>
        <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
      </div>
    )
  }
  return <div className={cn('h-px w-full bg-[rgba(255,255,255,0.06)]', className)} />
}

// ── Error alert (data / network / API) ─────────────────────────
export function ErrorAlert({
  message,
  onRetry,
  className,
  title = 'Could not load data',
}: {
  message: string
  onRetry?: () => void
  className?: string
  title?: string
}) {
  if (!message) return null
  return (
    <div
      className={cn(
        'rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2.5 text-left',
        className,
      )}
      role="alert"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-rose mt-0.5 flex-shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-rose mb-0.5">{title}</p>
          <p className="text-xs text-ink-muted leading-relaxed">{message}</p>
        </div>
        {onRetry && (
          <Button type="button" variant="ghost" size="sm" className="flex-shrink-0" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Empty State ────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  illustration?: 'search' | 'library' | 'history' | 'tools'
}

const illustrations = {
  search: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="28" cy="28" r="18" stroke="rgba(255,255,255,0.08)" strokeWidth="2"/>
      <path d="M42 42L54 54" stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="28" cy="28" r="8" stroke="rgba(245,166,35,0.3)" strokeWidth="1.5"/>
    </svg>
  ),
  library: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="12" width="48" height="8" rx="3" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5"/>
      <rect x="8" y="26" width="48" height="8" rx="3" fill="rgba(255,255,255,0.05)" stroke="rgba(245,166,35,0.25)" strokeWidth="1.5"/>
      <rect x="8" y="40" width="48" height="8" rx="3" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5"/>
    </svg>
  ),
  history: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="20" stroke="rgba(255,255,255,0.08)" strokeWidth="2"/>
      <path d="M32 20v12l8 8" stroke="rgba(245,166,35,0.4)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  tools: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="8" width="22" height="22" rx="6" fill="rgba(245,166,35,0.08)" stroke="rgba(245,166,35,0.25)" strokeWidth="1.5"/>
      <rect x="34" y="8" width="22" height="22" rx="6" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5"/>
      <rect x="8" y="34" width="22" height="22" rx="6" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5"/>
      <rect x="34" y="34" width="22" height="22" rx="6" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5"/>
    </svg>
  ),
}

export function EmptyState({ icon, title, description, action, illustration }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-3 py-16 text-center"
    >
      {illustration && (
        <div className="mb-2">{illustrations[illustration]}</div>
      )}
      {icon && !illustration && (
        <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] text-ink-dim">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        {description && <p className="text-xs text-ink-dim max-w-[280px]">{description}</p>}
      </div>
      {action}
    </motion.div>
  )
}
