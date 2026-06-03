import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/register', '/privacy', '/terms', '/share/'],
        disallow: [
          '/api/',
          '/dashboard',
          '/settings',
          '/library',
          '/tools/',
          '/projects',
          '/pipelines',
          '/activity',
          '/history',
          '/insights',
          '/forgot-password',
          '/reset-password',
        ],
      },
    ],
    sitemap: 'https://fluxdesk.app/sitemap.xml',
  }
}
