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
}

export default nextConfig
