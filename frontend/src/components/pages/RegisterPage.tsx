'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input, Divider } from '@/components/ui'
import { getAuthErrorMessage } from '@/lib/auth-errors'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

const schema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(60, 'Name must be 60 characters or less'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Use at least 8 characters'),
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { name: data.name, full_name: data.name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error

      // If email confirmation is disabled in Supabase, user is logged in directly
      // If enabled, show "check your email" state
      setEmailSent(true)
    } catch (err: unknown) {
      toast.error(getAuthErrorMessage(err, 'register'))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      toast.error(getAuthErrorMessage(error, 'oauth'))
    }
  }

  if (emailSent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm text-center"
      >
        <div className="w-12 h-12 rounded-2xl bg-[rgba(52,211,153,0.12)] border border-[rgba(52,211,153,0.25)] flex items-center justify-center mb-4 mx-auto">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M4 11l5 5L18 6" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-ink mb-2">Check your email</h1>
        <p className="text-sm text-ink-dim">We sent a confirmation link to your email. Open it to activate your account.</p>
        <Link href="/login" className="inline-block mt-5 text-sm text-amber hover:underline">
          Back to sign in
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="w-full max-w-sm"
    >
      <div className="flex flex-col items-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-[rgba(245,166,35,0.12)] border border-[rgba(245,166,35,0.25)] flex items-center justify-center mb-4">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M11 1L19.5 6.5V15.5L11 21L2.5 15.5V6.5L11 1Z" fill="#F5A623" fillOpacity="0.85"/>
            <path d="M11 5L15.5 7.75V13.25L11 16L6.5 13.25V7.75L11 5Z" fill="#09090b"/>
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-ink tracking-tight">Create your workspace</h1>
        <p className="text-sm text-ink-dim mt-1">21 AI tools, one place</p>
      </div>

      <div className="bg-[#111113] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full gap-2 mb-4"
          onClick={handleGoogleSignup}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </Button>

        <Divider label="or sign up with email" className="mb-4" />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Name"
            placeholder="Your name"
            required
            autoFocus
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            required
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Password"
            type="password"
            placeholder="Min 8 characters"
            required
            autoComplete="new-password"
            error={errors.password?.message}
            hint="At least 8 characters"
            {...register('password')}
          />
          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full mt-2">
            Create workspace
          </Button>
        </form>

        <p className="text-center text-sm text-ink-dim mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-amber hover:text-amber-hover transition-colors font-medium">
            Sign in
          </Link>
        </p>
        <p className="text-center text-[11px] text-ink-dim mt-3 px-2">
          By creating an account, you agree to our{' '}
          <Link href="/terms" className="hover:text-amber transition-colors underline underline-offset-2">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="hover:text-amber transition-colors underline underline-offset-2">Privacy Policy</Link>
        </p>
      </div>
    </motion.div>
  )
}
