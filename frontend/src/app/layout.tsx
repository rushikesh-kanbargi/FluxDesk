import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/shell/Providers'
import { PostHogProvider } from '@/components/shell/PostHogProvider'
import { CookieConsent } from '@/components/shell/CookieConsent'
import { Toaster } from 'react-hot-toast'

const BASE = 'https://fluxdesk.app'
const DESCRIPTION = 'The AI workspace that flows with your work. One desk, every tool, unlimited growth.'

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: 'FluxDesk — Work smarter, ship faster',
    template: '%s | FluxDesk',
  },
  description: DESCRIPTION,
  keywords: ['FluxDesk', 'AI workspace', 'knowledge worker', 'productivity', 'prompt engineering', 'code review', 'work smarter ship faster'],
  authors: [{ name: 'FluxDesk' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE,
    siteName: 'FluxDesk',
    title: 'FluxDesk — Work smarter, ship faster',
    description: DESCRIPTION,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'FluxDesk — The AI workspace that flows with your work' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FluxDesk — Work smarter, ship faster',
    description: DESCRIPTION,
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <Providers>
          <PostHogProvider>
            {children}
            <Toaster
              position="bottom-right"
              gutter={8}
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#1f1f23',
                  color: '#fafaf9',
                  border: '1px solid rgba(255,255,255,0.08)',
                  fontFamily: 'var(--font-sora)',
                  fontSize: '13px',
                  borderRadius: '8px',
                  padding: '10px 14px',
                },
                success: {
                  iconTheme: { primary: '#F5A623', secondary: '#09090b' },
                },
              }}
            />
            <CookieConsent />
          </PostHogProvider>
        </Providers>
      </body>
    </html>
  )
}
