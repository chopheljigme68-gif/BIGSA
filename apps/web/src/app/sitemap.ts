import type { MetadataRoute } from 'next';
import { api } from '@/lib/api';
import { SITE_URL } from '@/lib/site';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixed = ['', '/who-we-are', '/sports', '/forms', '/forms/downloads', '/news', '/archives', '/vision-mission', '/contact'].map((p) => ({ url: `${SITE_URL}${p}` }));
  try {
    const [sports, news, events, forms] = await Promise.all([api.sports(), api.news({ page: 1 }), api.events({ when: 'all' }), api.forms()]);
    return [
      ...fixed,
      ...sports.map((s) => ({ url: `${SITE_URL}/sports/${s.slug}` })),
      ...news.items.map((n) => ({ url: `${SITE_URL}/news/${n.slug}`, lastModified: n.published_at ?? undefined })),
      ...events.items.map((e) => ({ url: `${SITE_URL}/archives/${e.slug}` })),
      ...forms.map((f) => ({ url: `${SITE_URL}/forms/${f.slug}` })),
    ];
  } catch {
    return fixed;
  }
}
