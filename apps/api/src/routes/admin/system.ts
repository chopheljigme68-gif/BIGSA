/** Admin: dashboard, media library, messages, site settings, users, audit log. */
import { Router } from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { can } from '@bigsa/shared';
import { config } from '../../config';
import { query, one } from '../../db';
import { parse, notFound, badRequest, pageParams, str, forbidden } from '../../lib/http';
import { requirePermission, forgetSessions } from '../../lib/auth';
import { storeFile } from '../../lib/media';
import { audit, revalidate } from '../../lib/services';
import { PASSWORD_RULE } from './auth';
import { getSettings } from '../public';

export const systemRouter = Router();

// ---------------------------------------------------------------- dashboard
systemRouter.get('/dashboard', async (req, res) => {
  const role = req.user!.role;
  const [counts, recentApps, recentMessages, topPages, downloads, settings] = await Promise.all([
    one(`select
       (select count(*)::int from applications where status = 'received') as new_applications,
       (select count(*)::int from applications where created_at > now() - interval '30 days') as applications_30d,
       (select count(*)::int from contact_messages where not is_read) as unread_messages,
       (select count(*)::int from news where status = 'published') as published_news,
       (select count(*)::int from news where status = 'draft') as draft_news,
       (select count(*)::int from events where is_published and coalesce(ends_at, starts_at) >= now()) as upcoming_events,
       (select count(*)::int from forms where is_active) as active_forms,
       (select coalesce(sum(views), 0)::int from page_views where day > current_date - 30) as views_30d,
       (select count(*)::int from sports where coalesce(summary, '') = '') as sports_without_content,
       (select count(*)::int from team_members) as team_members`),
    can(role, 'applications')
      ? query(`select a.id, a.reference, a.status, a.applicant_name, a.created_at, f.title as form_title from applications a join forms f on f.id = a.form_id order by a.created_at desc limit 6`)
      : Promise.resolve([]),
    query(`select id, name, subject, is_read, created_at from contact_messages order by created_at desc limit 5`),
    query(`select path, sum(views)::int as views from page_views where day > current_date - 30 group by path order by views desc limit 8`),
    query(`select id, title, download_count from resources where download_count > 0 order by download_count desc limit 5`),
    getSettings(),
  ]);
  res.json({ counts, recentApps, recentMessages, topPages, downloads, pending: settings.pending ?? [] });
});

/** Options for select boxes in the admin UI. */
systemRouter.get('/lookups', async (_req, res) => {
  const sports = await query(`select id, name, slug from sports order by sort_order, name`);
  res.json({ sports });
});

// ---------------------------------------------------------------- media
const adminUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.upload.maxAdminFileMB * 1024 * 1024, files: 20 } });

systemRouter.get('/media', requirePermission('content'), async (req, res) => {
  const { page, pageSize, offset } = pageParams(req, 40, 200);
  const where = [`visibility = 'public'`];
  const params: unknown[] = [];
  const q = str(req.query.q);
  if (q) { params.push(`%${q}%`); where.push(`(filename ilike $${params.length} or alt ilike $${params.length} or caption ilike $${params.length})`); }
  if (req.query.kind === 'image') where.push(`mime like 'image/%'`);
  if (req.query.kind === 'document') where.push(`mime not like 'image/%'`);
  if (req.query.gallery === '1') where.push('in_gallery');
  const w = where.join(' and ');
  const [items, total] = await Promise.all([
    query(`select id, filename, mime, size, width, height, alt, caption, credit, in_gallery, created_at from media where ${w} order by created_at desc limit ${pageSize} offset ${offset}`, params),
    one<{ c: number }>(`select count(*)::int as c from media where ${w}`, params),
  ]);
  res.json({ items, total: total?.c ?? 0, page, pageSize });
});

systemRouter.post('/media', requirePermission('content'), adminUpload.array('files', 20), async (req, res) => {
  const files = (req.files as Express.Multer.File[]) ?? [];
  if (!files.length) throw badRequest('Choose at least one file to upload.');
  const inGallery = req.body.in_gallery === 'true';
  const opts = {
    visibility: 'public' as const,
    allowed: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'doc', 'docx', 'xlsx'],
    alt: str(req.body.alt) ?? null,
    inGallery,
    uploadedBy: req.user!.id,
  };
  // Process three files at a time: much faster than one by one, without
  // holding twenty decoded photos in memory at once.
  const stored: Awaited<ReturnType<typeof storeFile>>[] = [];
  for (let i = 0; i < files.length; i += 3) {
    stored.push(...(await Promise.all(files.slice(i, i + 3).map((f) => storeFile(f, opts)))));
  }
  await audit(req, 'media.upload', 'media', null, { count: stored.length });
  if (inGallery) revalidate('gallery');
  res.status(201).json(stored);
});

systemRouter.put('/media/:id', requirePermission('content'), async (req, res) => {
  const data = parse(z.object({
    alt: z.string().max(300).nullable().optional(),
    caption: z.string().max(500).nullable().optional(),
    credit: z.string().max(200).nullable().optional(),
    in_gallery: z.boolean().optional(),
  }), req.body);
  const row = await one(
    `update media set alt = coalesce($2, alt), caption = $3, credit = $4, in_gallery = coalesce($5, in_gallery) where id = $1 and visibility = 'public'
     returning id, filename, mime, size, width, height, alt, caption, credit, in_gallery, created_at`,
    [req.params.id, data.alt ?? null, data.caption ?? null, data.credit ?? null, data.in_gallery ?? null],
  );
  if (!row) throw notFound('File');
  revalidate('gallery', 'sports', 'news', 'events');
  res.json(row);
});

systemRouter.delete('/media/:id', requirePermission('content'), async (req, res) => {
  const row = await one(`delete from media where id = $1 and visibility = 'public' returning id`, [req.params.id]);
  if (!row) throw notFound('File');
  await audit(req, 'media.delete', 'media', req.params.id);
  revalidate('gallery', 'sports', 'news', 'events', 'resources');
  res.status(204).end();
});

// ---------------------------------------------------------------- messages
systemRouter.get('/messages', requirePermission('messages'), async (req, res) => {
  const { page, pageSize, offset } = pageParams(req, 30, 100);
  const unread = req.query.unread === '1' ? 'where not is_read' : '';
  const [items, total] = await Promise.all([
    query(`select id, name, email, phone, subject, message, is_read, created_at from contact_messages ${unread} order by created_at desc limit ${pageSize} offset ${offset}`),
    one<{ c: number }>(`select count(*)::int as c from contact_messages ${unread}`),
  ]);
  res.json({ items, total: total?.c ?? 0, page, pageSize });
});

systemRouter.patch('/messages/:id', requirePermission('messages'), async (req, res) => {
  const { is_read } = parse(z.object({ is_read: z.boolean() }), req.body);
  await query(`update contact_messages set is_read = $2 where id = $1`, [req.params.id, is_read]);
  res.json({ ok: true });
});

systemRouter.delete('/messages/:id', requirePermission('messages'), async (req, res) => {
  await query(`delete from contact_messages where id = $1`, [req.params.id]);
  await audit(req, 'message.delete', 'contact_messages', req.params.id);
  res.status(204).end();
});

// ---------------------------------------------------------------- settings
const SETTINGS_KEYS = ['contact', 'social', 'about', 'vision', 'motto', 'name_dz', 'pending'] as const;

systemRouter.get('/settings', requirePermission('settings'), async (_req, res) => {
  res.json(await getSettings());
});

systemRouter.put('/settings/:key', requirePermission('settings'), async (req, res) => {
  const key = req.params.key as (typeof SETTINGS_KEYS)[number];
  if (!SETTINGS_KEYS.includes(key)) throw notFound('Setting');
  const value = req.body?.value;
  if (value === undefined || JSON.stringify(value).length > 100_000) throw badRequest('Provide a value under 100 KB.');
  await query(
    `insert into site_settings (key, value, updated_by, updated_at) values ($1, $2, $3, now())
     on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()`,
    [key, JSON.stringify(value), req.user!.id],
  );
  await audit(req, 'settings.update', 'site_settings', key);
  revalidate('settings');
  res.json({ ok: true });
});

// ---------------------------------------------------------------- users
const users = Router();
users.use(requirePermission('users'));
const roleEnum = z.enum(['super_admin', 'editor', 'applications_officer']);

users.get('/', async (_req, res) => {
  res.json(await query(`select id, email, name, role, is_active, last_login_at, created_at, (locked_until > now()) as is_locked from admin_users order by name`));
});

users.post('/', async (req, res) => {
  // Every admin account has full access (the site has admins and guests only).
  const d = parse(z.object({ email: z.string().trim().email(), name: z.string().trim().min(2).max(120), role: roleEnum.default('super_admin'), password: PASSWORD_RULE }), req.body);
  const row = await one(
    `insert into admin_users (email, name, role, password_hash) values ($1,$2,$3,$4) returning id, email, name, role, is_active`,
    [d.email, d.name, d.role, await bcrypt.hash(d.password, 12)],
  );
  await audit(req, 'user.create', 'admin_users', row.id, { email: d.email, role: d.role });
  res.status(201).json(row);
});

users.put('/:id', async (req, res) => {
  const d = parse(z.object({ name: z.string().trim().min(2).max(120), role: roleEnum.default('super_admin'), is_active: z.boolean(), password: PASSWORD_RULE.optional().or(z.literal('')) }), req.body);
  if (req.params.id === req.user!.id && !d.is_active) throw forbidden('You can’t deactivate your own account.');
  const hash = d.password ? await bcrypt.hash(d.password, 12) : null;
  const row = await one(
    `update admin_users set name = $2, role = $3, is_active = $4,
       password_hash = coalesce($5, password_hash),
       token_version = token_version + case when $5::text is not null or not $4 then 1 else 0 end,
       failed_logins = 0, locked_until = null
     where id = $1 returning id, email, name, role, is_active`,
    [req.params.id, d.name, d.role, d.is_active, hash],
  );
  if (!row) throw notFound('User');
  forgetSessions();
  await audit(req, 'user.update', 'admin_users', row.id, { role: d.role, is_active: d.is_active, password_reset: Boolean(hash) });
  res.json(row);
});

systemRouter.use('/users', users);

// ---------------------------------------------------------------- audit log
systemRouter.get('/audit', requirePermission('audit'), async (req, res) => {
  const { page, pageSize, offset } = pageParams(req, 50, 200);
  const [items, total] = await Promise.all([
    query(`select id, actor_name, action, entity, entity_id, detail, created_at from audit_log order by created_at desc limit ${pageSize} offset ${offset}`),
    one<{ c: number }>(`select count(*)::int as c from audit_log`),
  ]);
  res.json({ items, total: total?.c ?? 0, page, pageSize });
});
