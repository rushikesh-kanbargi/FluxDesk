import { MetadataRoute } from 'next';

const BASE = 'https://fluxdesk.app';

const TOOL_ROUTES = [
  'forge', 'improver', 'code-review', 'bug-task', 'commit', 'adr',
  'feature-spec', 'standup', 'tech-stack', 'concept-explainer', 'flashcards',
  'compare', 'meeting-mirror', 'stakeholder-translator', 'decision-autopsy',
  'silence-detector', 'complexity-budget', 'context-handoff',
  'email-intent-decoder', 'work-brain-dump', 'feedback-translator',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: BASE, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/dashboard`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/library`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    ...TOOL_ROUTES.map(id => ({
      url: `${BASE}/tools/${id}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    { url: `${BASE}/auth/login`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/auth/register`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
  ];
}
