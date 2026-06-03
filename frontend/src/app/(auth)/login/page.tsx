import type { Metadata } from 'next'
import { Suspense } from 'react'
import LoginPage from '@/components/pages/LoginPage'

export const metadata: Metadata = {
  title: 'Log in to FluxDesk',
  description: 'Sign in to your FluxDesk account to access your AI workspace, prompts, and pipelines.',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: '/login',
  },
}

export default function LoginRoute() {
  return <Suspense><LoginPage /></Suspense>
}
