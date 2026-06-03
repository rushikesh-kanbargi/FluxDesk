/** @type {import('next').NextConfig} */
// Vercel runs its own Next.js runtime; `standalone` is for Docker/self-hosted (see Dockerfile).
const nextConfig = {
  ...(process.env.VERCEL ? {} : { output: 'standalone' }),
  experimental: {
    turbo: {},
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
  async headers() {
    const csp = [
      // Only same-origin frames allowed (overrides X-Frame-Options below for modern browsers)
      "default-src 'self'",
      // Next.js inline scripts + JSON-LD require 'unsafe-inline'; nonce-based CSP is a future upgrade
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Tailwind/CSS-in-JS need inline styles
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Fonts from Google Fonts
      "font-src 'self' https://fonts.gstatic.com",
      // API calls from the browser: Supabase auth, PostHog analytics
      "connect-src 'self' https://*.supabase.co https://*.supabase.io https://app.posthog.com https://eu.posthog.com",
      // User avatars from Google and GitHub
      "img-src 'self' data: blob: https://*.googleusercontent.com https://avatars.githubusercontent.com",
      // No embeds allowed
      "frame-src 'none'",
      // Prevent form submissions to external sites
      "form-action 'self'",
      // Disallow this site from being framed anywhere
      "frame-ancestors 'none'",
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
        ],
      },
    ]
  },
}

export default nextConfig
