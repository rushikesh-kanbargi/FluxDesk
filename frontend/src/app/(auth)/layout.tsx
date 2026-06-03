import type { Metadata } from 'next'

// Default noindex for all auth routes; login and register override below
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#09090b] flex items-center justify-center p-4">
      {children}
    </div>
  )
}
