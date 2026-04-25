'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input, Divider } from '@/components/ui'
import { getAuthCallbackErrorMessage, getAuthErrorMessage } from '@/lib/auth-errors'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    const message = getAuthCallbackErrorMessage(searchParams.get('error'))
    if (message) {
      toast.error(message)
    }
  }, [searchParams])

  useEffect(() => {
    if (searchParams.get('expired') === '1') {
      toast.error('Your session has expired. Please sign in again.')
    }
  }, [searchParams])

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })
      if (error) throw error
      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      toast.error(getAuthErrorMessage(err, 'login'))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      toast.error(getAuthErrorMessage(error, 'oauth'))
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="w-full max-w-sm"
    >
      {/* Logo + headline */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-[rgba(245,166,35,0.12)] border border-[rgba(245,166,35,0.25)] flex items-center justify-center mb-4">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M11 1L19.5 6.5V15.5L11 21L2.5 15.5V6.5L11 1Z" fill="#F5A623" fillOpacity="0.85"/>
            <path d="M11 5L15.5 7.75V13.25L11 16L6.5 13.25V7.75L11 5Z" fill="#09090b"/>
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-ink tracking-tight">Your AI workspace for knowledge work</h1>
        <p className="text-sm text-[rgba(245,166,35,0.7)] mt-1 font-medium tracking-wide">Tools. Memory. Flow.</p>
        <p className="text-xs text-ink-dim mt-2">Sign in to your workspace</p>
      </div>

      <div className="bg-[#111113] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            required
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <div className="flex justify-end -mt-2">
            <Link href="/forgot-password" className="text-xs text-ink-dim hover:text-amber transition-colors">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full mt-2">
            Sign in
          </Button>
        </form>

        <Divider label="or" className="my-5" />

        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full gap-2"
          onClick={handleGoogleLogin}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </Button>

        <p className="text-center text-sm text-ink-dim mt-4">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-amber hover:text-amber-hover transition-colors font-medium">
            Create one
          </Link>
        </p>
      </div>

      <p className="text-center text-[11px] text-ink-dim mt-4 px-2">
        By signing in, you agree to our{' '}
        <Link href="/terms" className="hover:text-amber transition-colors underline underline-offset-2">Terms</Link>
        {' '}and{' '}
        <Link href="/privacy" className="hover:text-amber transition-colors underline underline-offset-2">Privacy Policy</Link>
      </p>

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
