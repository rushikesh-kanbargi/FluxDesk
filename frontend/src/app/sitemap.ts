import { MetadataRoute } from 'next'

const BASE = 'https://fluxdesk.app'

// Stable date for static content — update when content changes significantly
const SITE_LAUNCH = new Date('2026-05-01')
const LEGAL_UPDATED = new Date('2026-04-01')

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE,
      lastModified: SITE_LAUNCH,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE}/login`,
      lastModified: SITE_LAUNCH,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${BASE}/register`,
      lastModified: SITE_LAUNCH,
      changeFrequency: 'yearly',
      priority: 0.6,
    },
    {
      url: `${BASE}/privacy`,
      lastModified: LEGAL_UPDATED,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE}/terms`,
      lastModified: LEGAL_UPDATED,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
