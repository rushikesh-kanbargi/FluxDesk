'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input } from '@/components/ui'
import { getAuthErrorMessage } from '@/lib/auth-errors'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

const schema = z
  .object({
    password: z.string().min(8, 'Use at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password })
      if (error) throw error
      toast.success('Password updated successfully')
      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      toast.error(getAuthErrorMessage(err, 'reset-password'))
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
        <h1 className="text-xl font-semibold text-ink tracking-tight">Set new password</h1>
        <p className="text-sm text-ink-dim mt-1">Choose a strong password for your account</p>
      </div>

      <div className="bg-[#111113] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="New password"
            type="password"
            placeholder="Min 8 characters"
            required
            autoComplete="new-password"
            autoFocus
            error={errors.password?.message}
            hint="At least 8 characters"
            {...register('password')}
          />
          <Input
            label="Confirm password"
            type="password"
            placeholder="Re-enter your password"
            required
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full mt-2">
            Update password
          </Button>
        </form>

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
