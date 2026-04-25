'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input } from '@/components/ui'
import { getAuthErrorMessage } from '@/lib/auth-errors'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
})
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })
      if (error) throw error
      setSent(true)
    } catch (err: unknown) {
      toast.error(getAuthErrorMessage(err, 'forgot-password'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="w-full max-w-sm"
    >
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-[rgba(245,166,35,0.12)] border border-[rgba(245,166,35,0.25)] flex items-center justify-center mb-4">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M11 1L19.5 6.5V15.5L11 21L2.5 15.5V6.5L11 1Z" fill="#F5A623" fillOpacity="0.85"/>
            <path d="M11 5L15.5 7.75V13.25L11 16L6.5 13.25V7.75L11 5Z" fill="#09090b"/>
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-ink tracking-tight">Forgot your password?</h1>
        <p className="text-sm text-ink-dim mt-1">We&apos;ll send you a reset link</p>
      </div>

      <div className="bg-[#111113] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="flex flex-col items-center text-center py-2"
            >
              <div className="w-12 h-12 rounded-2xl bg-[rgba(52,211,153,0.12)] border border-[rgba(52,211,153,0.25)] flex items-center justify-center mb-4">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M4 11l5 5L18 6" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className="text-base font-semibold text-ink mb-2">Check your email</h2>
              <p className="text-sm text-ink-dim leading-relaxed">
                We sent a password reset link to your email address. Click the link to set a new password.
              </p>
              <p className="text-xs text-ink-muted mt-3">
                Didn&apos;t receive it? Check your spam folder.
              </p>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                autoFocus
                error={errors.email?.message}
                {...register('email')}
              />
              <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full mt-2">
                Send reset link
              </Button>
            </motion.form>
          )}
        </AnimatePresence>

        <p className="text-center text-sm text-ink-dim mt-5">
          Remember your password?{' '}
          <Link href="/login" className="text-amber hover:text-amber-hover transition-colors font-medium">
            Sign in
          </Link>
        </p>
      </div>

      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none -z-10"
        style={{
          background: 'radial-gradient(ellipse 600px 400px at 50% 30%, rgba(245,166,35,0.04) 0%, transparent 70%)',
        }}
      />
    </motion.div>
  )
}
