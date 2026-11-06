/** Admin: online forms (builder) and submitted applications. */
import { Router } from 'express';
import { z } from 'zod';
import {
  validateDefinition, inputFields, displayValue, slugify, formStatus,
  APPLICATION_STATUSES, APPLICATION_STATUS_LABELS, type FormDefinition, type ApplicationStatus,
} from '@bigsa/shared';
import { query, one, tx } from '../../db';
import { parse, notFound, badRequest, pageParams, str } from '../../lib/http';
import { requirePermission } from '../../lib/auth';
import { audit, revalidate, sendMailLater } from '../../lib/services';
import { FORM_SELECT, withFormStatus } from '../../lib/selects';
import { sendFile } from '../media';

export const formsRouter = Router();
formsRouter.use(requirePermission('applications'));

const formSchema = z.object({
  title: z.string().trim().min(3, 'Give the form a title.').max(200),
  slug: z.string().trim().max(80).regex(/^[a-z0-9-]*$/).optional(),
  summary: z.string().trim().max(400).nullable().optional(),
  category: z.string().trim().min(2).max(60).default('General'),
  instructions: z.string().max(5000).nullable().optional(),
  eligibility: z.string().max(3000).nullable().optional(),
  requirements: z.string().max(3000).nullable().optional(),
  faq: z.array(z.object({ q: z.string().max(300), a: z.string().max(2000) })).max(30).default([]),
  contact_note: z.string().max(1000).nullable().optional(),
  definition: z.custom<FormDefinition>((d) => validateDefinition(d).length === 0, { message: 'The form fields are not valid.' }),
  opens_at: z.string().datetime({ offset: true }).nullable().optional(),
  closes_at: z.string().datetime({ offset: true }).nullable().optional(),
  is_active: z.boolean().default(false),
  notify_emails: z.array(z.string().email()).max(10).default([]),
  download_id: z.string().uuid().nullable().optional(),
  ref_prefix: z.string().trim().regex(/^[A-Z]{2,5}$/, 'Use 2–5 capital letters, e.g. ARC.').default('APP'),
  sort_order: z.number().int().min(0).max(1000).default(0),
});

function check(body: unknown) {
  const problems = validateDefinition((body as { definition?: unknown })?.definition);
  if (problems.length) throw badRequest('The form fields are not valid.', Object.fromEntries(problems.map((p, i) => [`definition.${i}`, p])));
  const data = parse(formSchema, body);
  if (data.opens_at && data.closes_at && data.closes_at <= data.opens_at) throw badRequest('The closing date must be after the opening date.', { closes_at: 'Must be after opening.' });
  return data;
}

const FORM_ADMIN_SELECT = `${FORM_SELECT}, f.notify_emails, f.ref_prefix, f.download_id,
  (select count(*)::int from applications a where a.form_id = f.id) as application_count,
  (select count(*)::int from applications a where a.form_id = f.id and a.status = 'received') as new_count`;

formsRouter.get('/forms', async (_req, res) => {
  const rows = await query(`select ${FORM_ADMIN_SELECT} from forms f order by f.sort_order, f.title`);
  res.json(rows.map(withFormStatus));
});

formsRouter.get('/forms/:id', async (req, res) => {
  const row = await one(`select ${FORM_ADMIN_SELECT} from forms f where f.id = $1`, [req.params.id]);
  if (!row) throw notFound('Form');
  res.json(withFormStatus(row));
});

async function saveForm(id: string | null, data: ReturnType<typeof check>) {
  const slug = slugify(data.slug || data.title);
  const values = [slug, data.title, data.summary ?? null, data.category, data.instructions ?? null, data.eligibility ?? null, data.requirements ?? null,
    JSON.stringify(data.faq), data.contact_note ?? null, JSON.stringify(data.definition), data.opens_at ?? null, data.closes_at ?? null,
    data.is_active, data.notify_emails, data.download_id ?? null, data.ref_prefix, data.sort_order];
  if (id) {
    return one<{ id: string }>(
      `update forms set slug=$2, title=$3, summary=$4, category=$5, instructions=$6, eligibility=$7, requirements=$8, faq=$9, contact_note=$10,
        definition=$11, opens_at=$12, closes_at=$13, is_active=$14, notify_emails=$15, download_id=$16, ref_prefix=$17, sort_order=$18
       where id = $1 returning id`, [id, ...values]);
  }
  return one<{ id: string }>(
    `insert into forms (slug, title, summary, category, instructions, eligibility, requirements, faq, contact_note, definition, opens_at, closes_at, is_active, notify_emails, download_id, ref_prefix, sort_order)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) returning id`, values);
}

formsRouter.post('/forms', async (req, res) => {
  const row = await saveForm(null, check(req.body));
  await audit(req, 'form.create', 'forms', row!.id);
  revalidate('forms');
  res.status(201).json({ id: row!.id });
});

formsRouter.put('/forms/:id', async (req, res) => {
  const row = await saveForm(req.params.id, check(req.body));
  if (!row) throw notFound('Form');
  await audit(req, 'form.update', 'forms', row.id);
  revalidate('forms');
  res.json({ id: row.id });
});

/** Quick toggle from the forms list. */
formsRouter.patch('/forms/:id/active', async (req, res) => {
  const { is_active } = parse(z.object({ is_active: z.boolean() }), req.body);
  const row = await one<{ id: string; is_active: boolean; opens_at: string | null; closes_at: string | null }>(
    `update forms set is_active = $2 where id = $1 returning id, is_active, opens_at, closes_at`,
    [req.params.id, is_active],
  );
  if (!row) throw notFound('Form');
  void audit(req, is_active ? 'form.activate' : 'form.deactivate', 'forms', req.params.id);
  revalidate('forms');
  // The list shows the computed status, so return it rather than making the client refetch.
  res.json({ ...row, status: formStatus(row) });
});

formsRouter.delete('/forms/:id', async (req, res) => {
  const used = await one<{ c: number }>(`select count(*)::int as c from applications where form_id = $1`, [req.params.id]);
  if (used && used.c > 0) throw badRequest('This form has applications, so it can’t be deleted. Deactivate it instead.');
  await query(`delete from forms where id = $1`, [req.params.id]);
  await audit(req, 'form.delete', 'forms', req.params.id);
  revalidate('forms');
  res.status(204).end();
});

// ---------------------------------------------------------------- applications

function applicationFilters(req: { query: Record<string, unknown> }) {
  const where = ['true'];
  const params: unknown[] = [];
  const formId = str(req.query.form);
  if (formId) { params.push(formId); where.push(`a.form_id = $${params.length}`); }
  const status = str(req.query.status);
  if (status && (APPLICATION_STATUSES as readonly string[]).includes(status)) { params.push(status); where.push(`a.status = $${params.length}`); }
  const q = str(req.query.q);
  if (q) {
    params.push(`%${q}%`);
    where.push(`(a.reference ilike $${params.length} or a.applicant_name ilike $${params.length} or a.applicant_email ilike $${params.length} or a.data::text ilike $${params.length})`);
  }
  const from = str(req.query.from);
  if (from) { params.push(from); where.push(`a.created_at >= $${params.length}::date`); }
  const to = str(req.query.to);
  if (to) { params.push(to); where.push(`a.created_at < ($${params.length}::date + 1)`); }
  return { where: where.join(' and '), params };
}

formsRouter.get('/applications', async (req, res) => {
  const { page, pageSize, offset } = pageParams(req, 25, 200);
  const { where, params } = applicationFilters(req);
  const [items, total] = await Promise.all([
    query(
      `select a.id, a.reference, a.status, a.applicant_name, a.applicant_email, a.applicant_phone, a.created_at, a.updated_at,
              jsonb_build_object('id', f.id, 'title', f.title, 'slug', f.slug) as form,
              (select count(*)::int from application_files af where af.application_id = a.id) as file_count
         from applications a join forms f on f.id = a.form_id
        where ${where} order by a.created_at desc limit ${pageSize} offset ${offset}`, params),
    one<{ c: number }>(`select count(*)::int as c from applications a where ${where}`, params),
  ]);
  res.json({ items, total: total?.c ?? 0, page, pageSize });
});

formsRouter.get('/applications/export.csv', async (req, res) => {
  const formId = str(req.query.form);
  if (!formId) throw badRequest('Choose a form to export.');
  const form = await one<{ title: string; slug: string; definition: FormDefinition }>(`select title, slug, definition from forms where id = $1`, [formId]);
  if (!form) throw notFound('Form');
  const { where, params } = applicationFilters(req);
  const rows = await query<{ reference: string; status: ApplicationStatus; created_at: string; data: Record<string, unknown> }>(
    `select a.reference, a.status, a.created_at, a.data from applications a where ${where} order by a.created_at`, params);
  const fields = inputFields(form.definition).filter((f) => f.type !== 'file');
  const cell = (v: unknown) => {
    let s = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // neutralise spreadsheet formula injection
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [
    ['Reference', 'Status', 'Submitted', ...fields.map((f) => f.label)].map(cell).join(','),
    ...rows.map((r) => [r.reference, APPLICATION_STATUS_LABELS[r.status], r.created_at, ...fields.map((f) => displayValue(f, r.data[f.key]))].map(cell).join(',')),
  ];
  await audit(req, 'applications.export', 'forms', formId, { count: rows.length });
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${form.slug}-${new Date().toISOString().slice(0, 10)}.csv"` });
  res.send('﻿' + lines.join('\r\n')); // BOM so Excel reads UTF-8 (Dzongkha names) correctly
});

formsRouter.get('/applications/:id', async (req, res) => {
  const app = await one(
    `select a.*, jsonb_build_object('id', f.id, 'title', f.title, 'slug', f.slug) as form,
       (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'field_key', af.field_key, 'filename', m.filename, 'mime', m.mime, 'size', m.size)), '[]')
          from application_files af join media m on m.id = af.media_id where af.application_id = a.id) as files,
       (select coalesce(jsonb_agg(n order by n.created_at), '[]') from (select id, author_name, body, kind, created_at from application_notes where application_id = a.id) n) as notes
     from applications a join forms f on f.id = a.form_id where a.id = $1`,
    [req.params.id],
  );
  if (!app) throw notFound('Application');
  delete app.ip_hash;
  await audit(req, 'application.view', 'applications', app.id);
  res.json(app);
});

formsRouter.patch('/applications/:id/status', async (req, res) => {
  const { status, note, notify } = parse(z.object({ status: z.enum(APPLICATION_STATUSES), note: z.string().max(2000).optional(), notify: z.boolean().default(false) }), req.body);
  const app = await tx(async (c) => {
    const { rows } = await c.query(`update applications set status = $2 where id = $1 returning id, reference, applicant_email`, [req.params.id, status]);
    if (!rows[0]) throw notFound('Application');
    const n = await c.query(
      `insert into application_notes (application_id, author_id, author_name, body, kind) values ($1,$2,$3,$4,'status')
       returning id, author_name, body, kind, created_at`,
      [req.params.id, req.user!.id, req.user!.name, `Status changed to ${APPLICATION_STATUS_LABELS[status]}${note ? `: ${note}` : ''}`]);
    return { ...(rows[0] as { id: string; reference: string; applicant_email: string | null }), note: n.rows[0] };
  });
  if (notify && app.applicant_email) {
    sendMailLater(app.applicant_email, `BIGSA: update on application ${app.reference}`,
      `The status of your application ${app.reference} is now: ${APPLICATION_STATUS_LABELS[status]}.${note ? `\n\n${note}` : ''}\n\nBhutan Indigenous Games and Sports Association`);
  }
  void audit(req, 'application.status', 'applications', app.id, { status });
  // Return the new timeline entry so the screen updates without another request.
  res.json({ status, note: app.note });
});

formsRouter.post('/applications/:id/notes', async (req, res) => {
  const { body } = parse(z.object({ body: z.string().trim().min(1, 'Write a note.').max(5000) }), req.body);
  const note = await one(
    `insert into application_notes (application_id, author_id, author_name, body) values ($1,$2,$3,$4) returning id, author_name, body, kind, created_at`,
    [req.params.id, req.user!.id, req.user!.name, body],
  );
  res.status(201).json(note);
});

formsRouter.get('/applications/:id/files/:mediaId', async (req, res) => {
  const file = await one<{ data: Buffer; mime: string; filename: string }>(
    `select m.data, m.mime, m.filename from application_files af join media m on m.id = af.media_id where af.application_id = $1 and m.id = $2`,
    [req.params.id, req.params.mediaId],
  );
  if (!file) throw notFound('File');
  await audit(req, 'application.file_download', 'applications', req.params.id, { media: req.params.mediaId });
  sendFile(res, file, { download: true, cache: 'private, no-store' });
});
