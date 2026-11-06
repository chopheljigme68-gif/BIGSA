/** Public, unauthenticated endpoints consumed by the Next.js site. */
import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import {
  validateSubmission, sanitizeSubmission, inputFields, formStatus, displayValue,
  type FormDefinition, type SubmissionFiles, type SiteSettings,
} from '@bigsa/shared';
import { config } from '../config';
import { query, one, tx } from '../db';
import { parse, notFound, badRequest, pageParams, str, HttpError } from '../lib/http';
import { storeFile } from '../lib/media';
import { sendMailLater, ipHash, assertHuman } from '../lib/services';
import { SPORT_SELECT, SPORT_CARD_SELECT, NEWS_SELECT, NEWS_CARD_SELECT, EVENT_SELECT, TEAM_SELECT, RESOURCE_SELECT, FORM_SELECT, withFormStatus } from '../lib/selects';

export const publicRouter = Router();

const submitLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 15, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many submissions from your network. Try again in an hour.' } });
const contactLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many messages from your network. Try again in an hour.' } });

// Browsers must re-check public API responses every time (a cheap 304 thanks to
// ETags), so an admin's change is never hidden behind a stale browser copy.
// Caching for speed is done by the Next.js site, which is refreshed on publish.
publicRouter.use((_req, res, next) => {
  res.set('Cache-Control', 'no-cache');
  next();
});

export async function getSettings(): Promise<SiteSettings> {
  const rows = await query<{ key: string; value: unknown }>(`select key, value from site_settings`);
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as unknown as SiteSettings;
}

// ------------------------------------------------------------------ site & home
publicRouter.get('/site', async (_req, res) => {
  res.json(await getSettings());
});

publicRouter.get('/home', async (_req, res) => {
  const [settings, sports, news, upcoming, forms, resources, gallery] = await Promise.all([
    getSettings(),
    query(`select ${SPORT_CARD_SELECT} from sports s where s.is_published order by s.sort_order, s.name`),
    query(`select ${NEWS_CARD_SELECT} from news n where n.status = 'published' and n.published_at <= now() order by n.is_featured desc, n.published_at desc limit 4`),
    query(`select ${EVENT_SELECT} from events e where e.is_published and coalesce(e.ends_at, e.starts_at) >= now() order by e.starts_at limit 4`),
    query(`select ${FORM_SELECT} from forms f where f.is_active order by f.sort_order, f.title`),
    query(`select ${RESOURCE_SELECT} from resources r where r.is_published order by r.is_featured desc, r.published_at desc limit 4`),
    query(`select media_json(id) as m from media where in_gallery and visibility = 'public' order by created_at desc limit 12`),
  ]);
  res.json({
    settings,
    sports,
    news,
    upcoming,
    forms: forms.map(withFormStatus).filter((f) => f.status === 'open' || f.status === 'upcoming'),
    resources,
    gallery: gallery.map((g) => g.m),
  });
});

// ------------------------------------------------------------------ sports
publicRouter.get('/sports', async (_req, res) => {
  res.json(await query(`select ${SPORT_CARD_SELECT} from sports s where s.is_published order by s.sort_order, s.name`));
});

publicRouter.get('/sports/:slug', async (req, res) => {
  const sport = await one(`select ${SPORT_SELECT} from sports s where s.slug = $1 and s.is_published`, [req.params.slug]);
  if (!sport) throw notFound('Sport');
  const [news, events, resources] = await Promise.all([
    query(`select ${NEWS_CARD_SELECT} from news n where n.sport_id = $1 and n.status = 'published' and n.published_at <= now() order by n.published_at desc limit 3`, [sport.id]),
    query(`select ${EVENT_SELECT} from events e where e.sport_id = $1 and e.is_published order by e.starts_at desc limit 4`, [sport.id]),
    query(`select ${RESOURCE_SELECT} from resources r where r.sport_id = $1 and r.is_published order by r.published_at desc`, [sport.id]),
  ]);
  res.json({ ...sport, news, events, resources });
});

// ------------------------------------------------------------------ news
publicRouter.get('/news', async (req, res) => {
  const { page, pageSize, offset } = pageParams(req, 12, 48);
  const category = str(req.query.category);
  const where = [`n.status = 'published'`, `n.published_at <= now()`];
  const params: unknown[] = [];
  if (category) { params.push(category); where.push(`n.category = $${params.length}`); }
  const w = where.join(' and ');
  const [items, total] = await Promise.all([
    query(`select ${NEWS_CARD_SELECT} from news n where ${w} order by n.published_at desc limit ${pageSize} offset ${offset}`, params),
    one<{ c: number }>(`select count(*)::int as c from news n where ${w}`, params),
  ]);
  res.json({ items, total: total?.c ?? 0, page, pageSize });
});

publicRouter.get('/news/:slug', async (req, res) => {
  const item = await one(`select ${NEWS_SELECT} from news n where n.slug = $1 and n.status = 'published' and n.published_at <= now()`, [req.params.slug]);
  if (!item) throw notFound('Article');
  const related = await query(
    `select ${NEWS_CARD_SELECT} from news n where n.status = 'published' and n.published_at <= now() and n.id <> $1
     order by (n.category = $2) desc, n.published_at desc limit 3`,
    [item.id, item.category],
  );
  res.json({ ...item, related });
});

// ------------------------------------------------------------------ events (archive)
publicRouter.get('/events', async (req, res) => {
  const { page, pageSize, offset } = pageParams(req, 24, 100);
  const when = req.query.when === 'upcoming' ? 'upcoming' : req.query.when === 'past' ? 'past' : 'all';
  const where = ['e.is_published'];
  const params: unknown[] = [];
  if (when === 'upcoming') where.push('coalesce(e.ends_at, e.starts_at) >= now()');
  if (when === 'past') where.push('coalesce(e.ends_at, e.starts_at) < now()');
  const sport = str(req.query.sport);
  if (sport) { params.push(sport); where.push(`e.sport_id = (select id from sports where slug = $${params.length})`); }
  const year = Number(req.query.year);
  if (year > 1900 && year < 3000) { params.push(year); where.push(`extract(year from e.starts_at at time zone 'Asia/Thimphu') = $${params.length}`); }
  const w = where.join(' and ');
  const order = when === 'upcoming' ? 'e.starts_at asc' : 'e.starts_at desc';
  const [items, total, years] = await Promise.all([
    query(`select ${EVENT_SELECT} from events e where ${w} order by ${order} limit ${pageSize} offset ${offset}`, params),
    one<{ c: number }>(`select count(*)::int as c from events e where ${w}`, params),
    query<{ y: number }>(`select distinct extract(year from starts_at at time zone 'Asia/Thimphu')::int as y from events where is_published order by y desc`),
  ]);
  res.json({ items, total: total?.c ?? 0, page, pageSize, years: years.map((r) => r.y) });
});

publicRouter.get('/events/:slug', async (req, res) => {
  const item = await one(`select ${EVENT_SELECT} from events e where e.slug = $1 and e.is_published`, [req.params.slug]);
  if (!item) throw notFound('Event');
  res.json(item);
});

// ------------------------------------------------------------------ team
publicRouter.get('/team', async (_req, res) => {
  res.json(await query(`select ${TEAM_SELECT} from team_members t where t.is_published order by t.sort_order, t.name`));
});

// ------------------------------------------------------------------ resources
publicRouter.get('/resources', async (req, res) => {
  const where = ['r.is_published'];
  const params: unknown[] = [];
  const q = str(req.query.q);
  if (q) { params.push(q); where.push(`r.search @@ prefix_tsquery($${params.length})`); }
  const category = str(req.query.category);
  if (category) { params.push(category); where.push(`r.category = $${params.length}`); }
  const sport = str(req.query.sport);
  if (sport) { params.push(sport); where.push(`r.sport_id = (select id from sports where slug = $${params.length})`); }
  res.json(await query(`select ${RESOURCE_SELECT} from resources r where ${where.join(' and ')} order by r.is_featured desc, r.published_at desc limit 200`, params));
});

/** Counted download. Redirects to the file so the count is recorded server-side. */
publicRouter.get('/resources/:id/download', async (req, res) => {
  const r = await one<{ file_id: string }>(
    `update resources set download_count = download_count + 1 where id = $1 and is_published and file_id is not null returning file_id`,
    [req.params.id],
  );
  if (!r) throw notFound('Document');
  res.redirect(302, `/media/${r.file_id}?download=1`);
});

// ------------------------------------------------------------------ forms
publicRouter.get('/forms', async (_req, res) => {
  const rows = await query(`select ${FORM_SELECT} from forms f where f.is_active order by f.sort_order, f.title`);
  res.json(rows.map(withFormStatus));
});

publicRouter.get('/forms/:slug', async (req, res) => {
  const row = await one(`select ${FORM_SELECT} from forms f where f.slug = $1 and f.is_active`, [req.params.slug]);
  if (!row) throw notFound('Form');
  res.json(withFormStatus(row));
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.upload.maxFileMB * 1024 * 1024, files: 20, fields: 50, fieldSize: 512 * 1024 },
});

publicRouter.post('/forms/:slug/submit', submitLimiter, upload.any(), async (req, res) => {
  assertHuman(req.body);
  const form = await one<{ id: string; title: string; definition: FormDefinition; ref_prefix: string; notify_emails: string[]; is_active: boolean; opens_at: string | null; closes_at: string | null }>(
    `select id, title, definition, ref_prefix, notify_emails, is_active, opens_at, closes_at from forms where slug = $1`,
    [req.params.slug],
  );
  if (!form) throw notFound('Form');
  const status = formStatus(form);
  if (status !== 'open') throw new HttpError(409, status === 'upcoming' ? 'This form is not open yet.' : 'This form is closed and no longer accepts applications.');

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(String(req.body.data ?? '{}'));
  } catch {
    throw badRequest('The form data could not be read.');
  }

  const fileList = (req.files as Express.Multer.File[] | undefined) ?? [];
  const fileFields = new Set(inputFields(form.definition).filter((f) => f.type === 'file').map((f) => f.key));
  const files: SubmissionFiles = {};
  for (const f of fileList) {
    if (!fileFields.has(f.fieldname)) throw badRequest('Unexpected file in submission.');
    (files[f.fieldname] ??= []).push({ name: f.originalname, size: f.size, mime: f.mimetype });
  }

  const data = sanitizeSubmission(form.definition, raw as never);
  const errors = validateSubmission(form.definition, data, files);
  if (Object.keys(errors).length) throw badRequest('Some fields need attention.', errors);

  // Applicant identity for listing and acknowledgement — first matching field wins.
  const fields = inputFields(form.definition);
  const pick = (pred: (k: string, t: string) => boolean) => {
    const f = fields.find((x) => pred(x.key, x.type));
    return f ? (data[f.key] as string | undefined) ?? null : null;
  };
  const applicantEmail = pick((_k, t) => t === 'email');
  const applicantName = pick((k) => /(^|_)(full_)?name$/.test(k) && !/team/.test(k));
  const applicantPhone = pick((_k, t) => t === 'tel');

  const result = await tx(async (client) => {
    const seq = await client.query<{ n: number }>(`select nextval('application_ref_seq')::int as n`);
    const year = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Thimphu', year: 'numeric' }).format(new Date());
    const reference = `${form.ref_prefix}-${year}-${String(seq.rows[0].n).padStart(5, '0')}`;
    const { rows } = await client.query<{ id: string; created_at: string }>(
      `insert into applications (reference, form_id, form_version, data, applicant_name, applicant_email, applicant_phone, ip_hash, user_agent)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id, created_at`,
      [reference, form.id, JSON.stringify(form.definition), JSON.stringify(data), applicantName, applicantEmail, applicantPhone, ipHash(req), String(req.get('user-agent') ?? '').slice(0, 300)],
    );
    const app = rows[0];
    const stored: { field: string; filename: string }[] = [];
    for (const f of fileList) {
      const field = fields.find((x) => x.key === f.fieldname)!;
      const m = await storeFile(f, { visibility: 'private', allowed: field.accept }, client);
      await client.query(`insert into application_files (application_id, field_key, media_id) values ($1,$2,$3)`, [app.id, f.fieldname, m.id]);
      stored.push({ field: f.fieldname, filename: m.filename });
    }
    await client.query(`insert into application_notes (application_id, body, kind) values ($1, 'Application received', 'status')`, [app.id]);
    return { id: app.id, reference, submitted_at: app.created_at, files: stored };
  });

  // Notifications happen after commit and never block or fail the submission.
  const summary = fields.map((f) => `${f.label}: ${displayValue(f, data[f.key])}`).filter((l) => !l.endsWith(': ')).join('\n');
  if (applicantEmail) {
    sendMailLater(applicantEmail, `BIGSA: we received your application ${result.reference}`,
      `Thank you. BIGSA has received your ${form.title.toLowerCase()}.\n\nReference number: ${result.reference}\nSubmitted: ${new Date(result.submitted_at).toUTCString()}\n\nKeep this reference number. Quote it if you contact BIGSA about this application.\n\nBhutan Indigenous Games and Sports Association\n${config.webUrl}`);
  }
  sendMailLater([...form.notify_emails, ...config.mail.notify], `New application ${result.reference}: ${form.title}`,
    `A new application was submitted.\n\nReference: ${result.reference}\n\n${summary}\n\nReview it in the admin panel: ${config.adminUrl}/applications/${result.id}`);

  res.status(201).json({ reference: result.reference, submitted_at: result.submitted_at, files: result.files });
});

// ------------------------------------------------------------------ contact
const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(120),
  email: z.string().trim().email('Enter an email address like name@example.com.').max(200),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  subject: z.string().trim().min(3, 'Enter a subject.').max(200),
  message: z.string().trim().min(10, 'Write a message of at least 10 characters.').max(5000),
});

publicRouter.post('/contact', contactLimiter, async (req, res) => {
  assertHuman(req.body ?? {});
  const body = parse(contactSchema, req.body);
  await query(`insert into contact_messages (name, email, phone, subject, message, ip_hash) values ($1,$2,$3,$4,$5,$6)`, [
    body.name, body.email, body.phone || null, body.subject, body.message, ipHash(req),
  ]);
  sendMailLater(config.mail.notify, `Website enquiry: ${body.subject}`, `From: ${body.name} <${body.email}> ${body.phone ?? ''}\n\n${body.message}`);
  res.status(201).json({ ok: true });
});

// ------------------------------------------------------------------ search
publicRouter.get('/search', async (req, res) => {
  const q = str(req.query.q)?.slice(0, 100);
  if (!q) return void res.json([]);
  const hl = `'MaxWords=24, MinWords=12, StartSel=<mark>, StopSel=</mark>'`;
  const rows = await query(
    `with tq as (select prefix_tsquery($1) as q)
     select * from (
       select 'sport' as type, name as title, ts_headline('english', coalesce(summary, tagline, name), tq.q, ${hl}) as snippet,
              '/sports/' || slug as url, ts_rank(search, tq.q) + 0.2 as rank
         from sports, tq where is_published and search @@ tq.q
       union all
       select 'news', title, ts_headline('english', coalesce(excerpt, left(body, 400)), tq.q, ${hl}), '/news/' || slug, ts_rank(search, tq.q)
         from news, tq where status = 'published' and published_at <= now() and search @@ tq.q
       union all
       select 'event', title, ts_headline('english', coalesce(summary, left(body, 400)), tq.q, ${hl}), '/archives/' || slug, ts_rank(search, tq.q)
         from events, tq where is_published and search @@ tq.q
       union all
       select 'resource', title, ts_headline('english', coalesce(description, title), tq.q, ${hl}), '/forms/downloads?q=' || $1, ts_rank(search, tq.q)
         from resources, tq where is_published and search @@ tq.q
       union all
       select 'form', title, ts_headline('english', coalesce(summary, title), tq.q, ${hl}), '/forms/' || slug, ts_rank(search, tq.q) + 0.1
         from forms, tq where is_active and search @@ tq.q
     ) hits order by rank desc limit 30`,
    [q],
  );
  res.json(rows);
});

// ------------------------------------------------------------------ privacy-friendly page counts
const trackSchema = z.object({ path: z.string().regex(/^\/[\w\-/]*$/).max(200) });
publicRouter.post('/track', async (req, res) => {
  const r = trackSchema.safeParse(req.body);
  if (r.success) {
    await query(`insert into page_views (path) values ($1) on conflict (path, day) do update set views = page_views.views + 1`, [r.data.path]);
  }
  res.status(204).end();
});
