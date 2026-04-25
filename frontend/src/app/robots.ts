import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/auth/login', '/auth/register'],
        disallow: ['/api/', '/dashboard/', '/settings/', '/library/', '/tools/'],
      },
    ],
    sitemap: 'https://fluxdesk.app/sitemap.xml',
    host: 'https://fluxdesk.app',
  };
}
