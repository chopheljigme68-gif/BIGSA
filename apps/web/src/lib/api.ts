/**
 * Server-side data access for the public site.
 * Responses are cached (ISR) and refreshed on demand when an admin publishes,
 * via the tags below and POST /api/revalidate.
 */
import 'server-only';
import { notFound } from 'next/navigation';
import type { HomeData, Sport, NewsItem, EventItem, TeamMember, Resource, PublicForm, SiteSettings, Paged, SearchHit } from '@bigsa/shared';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

async function get<T>(path: string, tags: string[], revalidate = 600): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, { next: { tags, revalidate } });
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error(`API ${res.status} for ${path}`);
  return res.json() as Promise<T>;
}

const qs = (params: Record<string, string | number | undefined>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') s.set(k, String(v));
  const str = s.toString();
  return str ? `?${str}` : '';
};

export type SportDetail = Sport & { news: NewsItem[]; events: EventItem[]; resources: Resource[] };
export type ArticleDetail = NewsItem & { related: NewsItem[] };
export type EventsPage = Paged<EventItem> & { years: number[] };

export const api = {
  home: () => get<HomeData>('/home', ['home', 'news', 'events', 'sports', 'forms', 'resources', 'settings', 'gallery'], 300),
  settings: () => get<SiteSettings>('/site', ['settings']),
  sports: () => get<Sport[]>('/sports', ['sports']),
  sport: (slug: string) => get<SportDetail>(`/sports/${encodeURIComponent(slug)}`, ['sports', 'news', 'events', 'resources']),
  news: (p: { page?: number; category?: string }) => get<Paged<NewsItem>>(`/news${qs(p)}`, ['news'], 300),
  article: (slug: string) => get<ArticleDetail>(`/news/${encodeURIComponent(slug)}`, ['news']),
  events: (p: { when?: string; sport?: string; year?: number; page?: number }) => get<EventsPage>(`/events${qs(p)}`, ['events'], 300),
  event: (slug: string) => get<EventItem>(`/events/${encodeURIComponent(slug)}`, ['events']),
  team: () => get<TeamMember[]>('/team', ['team']),
  resources: (p: { q?: string; category?: string; sport?: string }) => get<Resource[]>(`/resources${qs(p)}`, ['resources'], 300),
  forms: () => get<PublicForm[]>('/forms', ['forms'], 120),
  form: (slug: string) => get<PublicForm>(`/forms/${encodeURIComponent(slug)}`, ['forms'], 60),
  search: (q: string) => get<SearchHit[]>(`/search${qs({ q })}`, ['search'], 60),
};
