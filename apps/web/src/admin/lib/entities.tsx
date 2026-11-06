'use client';

import type { ReactNode } from 'react';
import { NEWS_CATEGORIES, RESOURCE_CATEGORIES, formatDate, formatDateRange, formatBytes } from '@bigsa/shared';

/**
 * Admin content types. Each one declares its list columns and editor fields;
 * the generic EntityList / EntityEditor render everything from this config.
 * Adding a content type is a config change here plus a CRUD entry in the API.
 */

export type SubField = { key: string; label: string; type?: 'text' | 'textarea' | 'image'; placeholder?: string; width?: number };

export type FieldDef = { key: string; label: string; hint?: ReactNode; required?: boolean; wide?: boolean } & (
  | { type: 'text' | 'textarea' | 'markdown' | 'url' | 'email' | 'number' | 'datetime' | 'checkbox' | 'image' | 'file' | 'gallery' | 'rules' }
  | { type: 'select'; options: { value: string; label: string }[] | 'sports'; empty?: string }
  | { type: 'list'; item: SubField[]; addLabel: string; max?: number }
);

export interface EntityConfig {
  name: string;
  title: string;
  singular: string;
  description: string;
  publicPath?: (item: any) => string | null;
  statusFilters?: { value: string; label: string }[];
  columns: { label: string; render: (item: any) => ReactNode; width?: string }[];
  thumb?: (item: any) => string | null;
  fields: FieldDef[];
  defaults: Record<string, unknown>;
  /** Map API item -> editable form state (strip read-only/joined fields). */
  toForm?: (item: any) => Record<string, unknown>;
}

const pill = (on: boolean, yes: string, no: string) => <span className={`a-pill a-pill--${on ? 'ok' : 'neutral'}`}>{yes && on ? yes : no}</span>;
const options = (o: Record<string, string>) => Object.entries(o).map(([value, label]) => ({ value, label }));

export const ENTITIES: Record<string, EntityConfig> = {
  news: {
    name: 'news',
    title: 'News',
    singular: 'article',
    description: 'News, announcements, tournament notices, training, application notices and results.',
    publicPath: (n) => (n.status === 'published' ? `/news/${n.slug}` : null),
    statusFilters: [{ value: 'published', label: 'Published' }, { value: 'draft', label: 'Drafts' }],
    thumb: (n) => n.cover?.id ?? null,
    columns: [
      { label: 'Title', render: (n) => <strong>{n.title}</strong> },
      { label: 'Category', render: (n) => NEWS_CATEGORIES[n.category as keyof typeof NEWS_CATEGORIES], width: '160px' },
      { label: 'Status', render: (n) => (n.status === 'published' ? <span className="a-pill a-pill--ok">Published</span> : <span className="a-pill a-pill--warn">Draft</span>), width: '120px' },
      { label: 'Date', render: (n) => formatDate(n.published_at), width: '130px' },
    ],
    defaults: { title: '', slug: '', excerpt: '', body: '', category: 'news', sport_id: null, cover_id: null, is_featured: false, status: 'draft', published_at: null },
    toForm: (n) => ({ title: n.title, slug: n.slug, excerpt: n.excerpt ?? '', body: n.body, category: n.category, sport_id: n.sport_id, cover_id: n.cover_id, is_featured: n.is_featured, status: n.status, published_at: n.published_at }),
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true, wide: true },
      { key: 'excerpt', label: 'Summary', type: 'textarea', wide: true, hint: 'One or two sentences shown on cards and in search results.' },
      { key: 'body', label: 'Article', type: 'markdown', wide: true },
      { key: 'cover_id', label: 'Cover photo', type: 'image' },
      { key: 'category', label: 'Category', type: 'select', options: options(NEWS_CATEGORIES) },
      { key: 'sport_id', label: 'Sport', type: 'select', options: 'sports', empty: 'Not about one sport' },
      { key: 'status', label: 'Status', type: 'select', options: [{ value: 'draft', label: 'Draft (not public)' }, { value: 'published', label: 'Published' }] },
      { key: 'published_at', label: 'Publish date', type: 'datetime', hint: 'Leave empty to use the moment you publish. A future date schedules it.' },
      { key: 'is_featured', label: 'Feature on the home page', type: 'checkbox' },
      { key: 'slug', label: 'Web address', type: 'text', hint: 'Made from the title if left empty.' },
    ],
  },
  events: {
    name: 'events',
    title: 'Events & archive',
    singular: 'event',
    description: 'Tournaments and events. Past events stay in the public archive with results and photos.',
    publicPath: (e) => (e.is_published ? `/archives/${e.slug}` : null),
    statusFilters: [{ value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past' }],
    thumb: (e) => e.cover?.id ?? null,
    columns: [
      { label: 'Event', render: (e) => <strong>{e.title}</strong> },
      { label: 'When', render: (e) => formatDateRange(e.starts_at, e.ends_at), width: '190px' },
      { label: 'Sport', render: (e) => e.sport?.name ?? '—', width: '120px' },
      { label: 'Visible', render: (e) => pill(e.is_published, 'Public', 'Hidden'), width: '100px' },
    ],
    defaults: { title: '', slug: '', summary: '', body: '', venue: '', starts_at: null, ends_at: null, results: '', sport_id: null, cover_id: null, gallery_ids: [], is_published: true },
    toForm: (e) => ({ title: e.title, slug: e.slug, summary: e.summary ?? '', body: e.body, venue: e.venue ?? '', starts_at: e.starts_at, ends_at: e.ends_at, results: e.results ?? '', sport_id: e.sport_id, cover_id: e.cover_id, gallery_ids: e.gallery_ids ?? [], is_published: e.is_published }),
    fields: [
      { key: 'title', label: 'Event name', type: 'text', required: true, wide: true },
      { key: 'starts_at', label: 'Starts', type: 'datetime', required: true },
      { key: 'ends_at', label: 'Ends', type: 'datetime' },
      { key: 'venue', label: 'Venue', type: 'text' },
      { key: 'sport_id', label: 'Sport', type: 'select', options: 'sports', empty: 'Several or none' },
      { key: 'summary', label: 'Summary', type: 'textarea', wide: true },
      { key: 'body', label: 'Details', type: 'markdown', wide: true },
      { key: 'results', label: 'Results', type: 'markdown', wide: true, hint: 'Add after the event. Shown on the archive page.' },
      { key: 'cover_id', label: 'Cover photo', type: 'image' },
      { key: 'is_published', label: 'Show on the public site', type: 'checkbox' },
      { key: 'gallery_ids', label: 'Photo album', type: 'gallery', wide: true },
      { key: 'slug', label: 'Web address', type: 'text', hint: 'Made from the name if left empty.' },
    ],
  },
  sports: {
    name: 'sports',
    title: 'Sports',
    singular: 'sport',
    description: 'The indigenous games and sports archive. Add new games at any time; drag order with the arrows.',
    publicPath: (s) => (s.is_published ? `/sports/${s.slug}` : null),
    thumb: (s) => s.cover?.id ?? null,
    columns: [
      { label: 'Sport', render: (s) => <strong>{s.name}</strong> },
      { label: 'Content', render: (s) => (s.has_content ? <span className="a-pill a-pill--ok">Complete</span> : <span className="a-pill a-pill--warn">Needs content</span>), width: '140px' },
      { label: 'Rules', render: (s) => `${s.rules?.length ?? 0} articles`, width: '110px' },
      { label: 'Visible', render: (s) => pill(s.is_published, 'Public', 'Hidden'), width: '100px' },
    ],
    defaults: { name: '', slug: '', name_dz: '', tagline: '', summary: '', history: '', how_to_play: '', cultural_significance: '', facts: [], scoring: [], equipment: [], rules: [], video_url: '', cover_id: null, gallery_ids: [], sort_order: 0, is_published: true },
    toForm: (s) => ({
      name: s.name, slug: s.slug, name_dz: s.name_dz ?? '', tagline: s.tagline ?? '', summary: s.summary ?? '', history: s.history ?? '', how_to_play: s.how_to_play ?? '',
      cultural_significance: s.cultural_significance ?? '', facts: s.facts, scoring: s.scoring,
      equipment: (s.equipment ?? []).map((e: any) => ({ name: e.name, name_dz: e.name_dz ?? '', description: e.description, image_id: e.image_id ?? null })),
      rules: s.rules, video_url: s.video_url ?? '', cover_id: s.cover?.id ?? null, gallery_ids: (s.gallery ?? []).map((g: any) => g.id), sort_order: s.sort_order, is_published: s.is_published,
    }),
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'name_dz', label: 'Name in Dzongkha', type: 'text' },
      { key: 'tagline', label: 'Tagline', type: 'text', wide: true, hint: 'One line, shown under the name.' },
      { key: 'summary', label: 'Summary', type: 'textarea', wide: true, hint: 'Two or three sentences. A sport shows as “in preparation” until this is filled in.' },
      { key: 'history', label: 'Background and origin', type: 'textarea', wide: true },
      { key: 'how_to_play', label: 'How it’s played', type: 'textarea', wide: true },
      { key: 'cultural_significance', label: 'Cultural significance', type: 'textarea', wide: true },
      { key: 'facts', label: 'Key numbers', type: 'list', wide: true, max: 6, addLabel: 'Add a number', item: [{ key: 'label', label: 'Label', placeholder: 'Range', width: 1 }, { key: 'value', label: 'Value', placeholder: '140 m', width: 1 }, { key: 'note', label: 'Note', placeholder: 'between targets', width: 2 }] },
      { key: 'scoring', label: 'Scoring', type: 'list', wide: true, addLabel: 'Add a scoring rule', hint: 'Names containing Karey, Gorthig, Sa-karey, Daya, Dhobji or Zhecha light up the matching part of the interactive target.', item: [{ key: 'name', label: 'Name', placeholder: 'Karey', width: 1 }, { key: 'points', label: 'Points', placeholder: '2', width: 0.5 }, { key: 'description', label: 'Description', type: 'textarea', width: 3 }] },
      { key: 'equipment', label: 'Equipment', type: 'list', wide: true, addLabel: 'Add equipment', item: [{ key: 'name', label: 'Name', width: 1 }, { key: 'name_dz', label: 'Dzongkha', width: 1 }, { key: 'description', label: 'Description', type: 'textarea', width: 3 }, { key: 'image_id', label: 'Photo', type: 'image', width: 1 }] },
      { key: 'rules', label: 'Rules and regulations', type: 'rules', wide: true },
      { key: 'cover_id', label: 'Cover photo', type: 'image' },
      { key: 'video_url', label: 'Video link', type: 'url', hint: 'YouTube or Vimeo address.' },
      { key: 'gallery_ids', label: 'Photos', type: 'gallery', wide: true },
      { key: 'is_published', label: 'Show on the public site', type: 'checkbox' },
      { key: 'slug', label: 'Web address', type: 'text', hint: 'Made from the name if left empty.' },
    ],
  },
  team: {
    name: 'team',
    title: 'Who’s who',
    singular: 'profile',
    description: 'BIGSA’s personnel and their responsibilities, shown on the Who we are page in this order.',
    publicPath: () => '/who-we-are#team',
    thumb: (t) => t.photo?.id ?? null,
    columns: [
      { label: 'Name', render: (t) => <strong>{t.name}</strong> },
      { label: 'Designation', render: (t) => t.designation },
      { label: 'Visible', render: (t) => pill(t.is_published, 'Public', 'Hidden'), width: '100px' },
    ],
    defaults: { name: '', designation: '', bio: '', responsibilities: '', email: '', phone: '', photo_id: null, sort_order: 0, is_published: true },
    toForm: (t) => ({ name: t.name, designation: t.designation, bio: t.bio ?? '', responsibilities: t.responsibilities ?? '', email: t.email ?? '', phone: t.phone ?? '', photo_id: t.photo_id, sort_order: t.sort_order, is_published: t.is_published }),
    fields: [
      { key: 'name', label: 'Full name', type: 'text', required: true },
      { key: 'designation', label: 'Designation', type: 'text', required: true },
      { key: 'photo_id', label: 'Photograph', type: 'image' },
      { key: 'bio', label: 'Brief professional profile', type: 'textarea', wide: true },
      { key: 'responsibilities', label: 'Principal responsibilities', type: 'textarea', wide: true },
      { key: 'email', label: 'Official email', type: 'email', hint: 'Only if approved for public display.' },
      { key: 'phone', label: 'Official phone', type: 'text', hint: 'Only if approved for public display.' },
      { key: 'is_published', label: 'Show on the public site', type: 'checkbox' },
    ],
  },
  resources: {
    name: 'resources',
    title: 'Documents',
    singular: 'document',
    description: 'Rules, standards, frameworks, guidelines, downloadable forms, policies, reports and notices.',
    publicPath: () => '/forms/downloads',
    columns: [
      { label: 'Document', render: (r) => <strong>{r.title}</strong> },
      { label: 'Category', render: (r) => RESOURCE_CATEGORIES[r.category as keyof typeof RESOURCE_CATEGORIES], width: '200px' },
      { label: 'File', render: (r) => (r.file ? formatBytes(r.file.size) : '—'), width: '90px' },
      { label: 'Downloads', render: (r) => r.download_count, width: '100px' },
      { label: 'Visible', render: (r) => pill(r.is_published, 'Public', 'Hidden'), width: '100px' },
    ],
    defaults: { title: '', description: '', category: 'rules', sport_id: null, file_id: null, is_featured: false, is_published: true },
    toForm: (r) => ({ title: r.title, description: r.description ?? '', category: r.category, sport_id: r.sport_id, file_id: r.file_id, is_featured: r.is_featured, is_published: r.is_published, published_at: r.published_at }),
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true, wide: true },
      { key: 'file_id', label: 'File', type: 'file', required: true, hint: 'PDF, Word or Excel, up to 25 MB.' },
      { key: 'category', label: 'Category', type: 'select', options: options(RESOURCE_CATEGORIES) },
      { key: 'sport_id', label: 'Sport', type: 'select', options: 'sports', empty: 'Not about one sport' },
      { key: 'description', label: 'Description', type: 'textarea', wide: true },
      { key: 'is_featured', label: 'Feature on the home page', type: 'checkbox' },
      { key: 'is_published', label: 'Show on the public site', type: 'checkbox' },
    ],
  },
};
