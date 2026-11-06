/**
 * Column lists producing the shapes in packages/shared/src/types.ts.
 * Shared by public and admin routes so both always agree.
 */
import { formStatus, type PublicForm } from '@bigsa/shared';

export const SPORT_SELECT = `
  s.id, s.slug, s.name, s.name_dz, s.tagline, s.summary, s.history, s.how_to_play, s.cultural_significance,
  s.facts, s.scoring, s.rules, s.video_url, s.sort_order, s.is_published,
  (select coalesce(jsonb_agg(e || jsonb_build_object('image', media_json((e->>'image_id')::uuid))), '[]'::jsonb)
     from jsonb_array_elements(s.equipment) e) as equipment,
  media_json(s.cover_id) as cover,
  media_list_json(s.gallery_ids) as gallery,
  (coalesce(s.summary, '') <> '') as has_content`;

export const SPORT_CARD_SELECT = `
  s.id, s.slug, s.name, s.name_dz, s.tagline, s.summary, s.facts, s.scoring, s.sort_order, s.is_published,
  media_json(s.cover_id) as cover, (coalesce(s.summary, '') <> '') as has_content`;

export const NEWS_SELECT = `
  n.id, n.slug, n.title, n.excerpt, n.body, n.category, n.is_featured, n.status, n.published_at,
  media_json(n.cover_id) as cover, sport_json(n.sport_id) as sport, n.sport_id, n.cover_id`;

export const NEWS_CARD_SELECT = `
  n.id, n.slug, n.title, n.excerpt, n.category, n.is_featured, n.status, n.published_at,
  media_json(n.cover_id) as cover, sport_json(n.sport_id) as sport`;

export const EVENT_SELECT = `
  e.id, e.slug, e.title, e.summary, e.body, e.venue, e.starts_at, e.ends_at, e.results, e.is_published,
  media_json(e.cover_id) as cover, media_list_json(e.gallery_ids) as gallery, sport_json(e.sport_id) as sport,
  e.sport_id, e.cover_id, e.gallery_ids`;

export const TEAM_SELECT = `
  t.id, t.name, t.designation, t.bio, t.responsibilities, t.email, t.phone, t.sort_order, t.is_published,
  media_json(t.photo_id) as photo, t.photo_id`;

export const RESOURCE_SELECT = `
  r.id, r.title, r.description, r.category, r.download_count, r.is_featured, r.is_published, r.published_at,
  sport_json(r.sport_id) as sport, file_json(r.file_id) as file, r.sport_id, r.file_id`;

export const FORM_SELECT = `
  f.id, f.slug, f.title, f.summary, f.category, f.instructions, f.eligibility, f.requirements, f.faq,
  f.contact_note, f.definition, f.opens_at, f.closes_at, f.is_active, f.sort_order,
  case when f.download_id is null then null else jsonb_build_object('id', f.download_id, 'filename', (select filename from media where id = f.download_id)) end as download`;

export function withFormStatus<T extends Omit<PublicForm, 'status'>>(row: T): T & { status: PublicForm['status'] } {
  return { ...row, status: formStatus(row) };
}
