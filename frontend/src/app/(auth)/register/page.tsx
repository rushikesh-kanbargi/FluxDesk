import type { Metadata } from 'next'
import { Suspense } from 'react'
import RegisterPage from '@/components/pages/RegisterPage'

export const metadata: Metadata = {
  title: 'Create your FluxDesk account — Free',
  description: 'Sign up for FluxDesk and get your AI workspace up and running in seconds. No credit card required.',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: '/register',
  },
}

export default function RegisterRoute() {
  return <Suspense><RegisterPage /></Suspense>
}
