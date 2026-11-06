/**
 * Generic admin CRUD for simple content types (news, events, sports, team, resources).
 * Each entity declares its table, a zod schema for writes and its select list;
 * only columns present in the schema can ever be written.
 */
import { Router } from 'express';
import { z, type ZodObject, type ZodRawShape } from 'zod';
import { slugify } from '@bigsa/shared';
import { query, one } from '../../db';
import { parse, notFound, pageParams, str } from '../../lib/http';
import { audit, revalidate } from '../../lib/services';
import { requirePermission } from '../../lib/auth';
import { SPORT_SELECT, NEWS_SELECT, EVENT_SELECT, TEAM_SELECT, RESOURCE_SELECT } from '../../lib/selects';

interface EntityConfig<S extends ZodRawShape> {
  name: string;          // url segment and audit entity
  table: string;
  alias: string;
  select: string;
  schema: ZodObject<S>;
  orderBy: string;
  searchColumns: string[];
  slugFrom?: string;     // column to derive slug from when not provided
  statusFilter?: (status: string) => string | null;
  tags: string[];        // cache tags to revalidate on the public site
  /** JSON columns must be serialised before writing. */
  jsonColumns?: string[];
}

const nullableText = (max = 500) => z.string().trim().max(max).nullable().optional().transform((v) => (v === '' ? null : v ?? null));
const uuidOrNull = z.string().uuid().nullable().optional().transform((v) => v ?? null);
const isoOrNull = z.string().datetime({ offset: true }).nullable().optional().transform((v) => v ?? null);
const slug = z.string().trim().max(80).regex(/^[a-z0-9-]*$/, 'Use lowercase letters, numbers and hyphens.').optional();

export const entities = {
  news: {
    name: 'news', table: 'news', alias: 'n', select: NEWS_SELECT, orderBy: 'coalesce(n.published_at, n.created_at) desc',
    searchColumns: ['n.title', 'n.excerpt'], slugFrom: 'title', tags: ['news'],
    statusFilter: (s: string) => (s === 'draft' || s === 'published' ? `n.status = '${s}'` : null),
    schema: z.object({
      title: z.string().trim().min(3, 'Give the article a title.').max(200),
      slug,
      excerpt: nullableText(400),
      body: z.string().max(100_000).default(''),
      category: z.enum(['news', 'announcement', 'tournament', 'training', 'notice', 'result']),
      sport_id: uuidOrNull,
      cover_id: uuidOrNull,
      is_featured: z.boolean().default(false),
      status: z.enum(['draft', 'published']),
      published_at: isoOrNull,
    }),
  },
  events: {
    name: 'events', table: 'events', alias: 'e', select: EVENT_SELECT, orderBy: 'e.starts_at desc',
    searchColumns: ['e.title', 'e.venue'], slugFrom: 'title', tags: ['events'],
    statusFilter: (s: string) => (s === 'upcoming' ? 'coalesce(e.ends_at, e.starts_at) >= now()' : s === 'past' ? 'coalesce(e.ends_at, e.starts_at) < now()' : null),
    schema: z.object({
      title: z.string().trim().min(3, 'Give the event a title.').max(200),
      slug,
      summary: nullableText(600),
      body: z.string().max(100_000).default(''),
      venue: nullableText(200),
      starts_at: z.string().datetime({ offset: true, message: 'Choose a start date.' }),
      ends_at: isoOrNull,
      results: nullableText(20_000),
      sport_id: uuidOrNull,
      cover_id: uuidOrNull,
      gallery_ids: z.array(z.string().uuid()).max(60).default([]),
      is_published: z.boolean().default(true),
    }),
  },
  sports: {
    name: 'sports', table: 'sports', alias: 's', select: SPORT_SELECT, orderBy: 's.sort_order, s.name',
    searchColumns: ['s.name', 's.tagline'], slugFrom: 'name', tags: ['sports'], jsonColumns: ['facts', 'scoring', 'equipment', 'rules'],
    schema: z.object({
      name: z.string().trim().min(2).max(120),
      slug,
      name_dz: nullableText(120),
      tagline: nullableText(200),
      summary: nullableText(600),
      history: nullableText(20_000),
      how_to_play: nullableText(20_000),
      cultural_significance: nullableText(20_000),
      facts: z.array(z.object({ label: z.string().max(40), value: z.string().max(20), note: z.string().max(80).optional() })).max(6).default([]),
      scoring: z.array(z.object({ name: z.string().max(60), points: z.string().max(10), description: z.string().max(400) })).max(20).default([]),
      equipment: z.array(z.object({ name: z.string().max(80), name_dz: z.string().max(80).optional(), description: z.string().max(1000), image_id: z.string().uuid().nullable().optional() })).max(30).default([]),
      rules: z.array(z.object({ title: z.string().max(200), items: z.array(z.string().max(3000)).max(60) })).max(60).default([]),
      video_url: z.string().url('Paste a full link, e.g. https://www.youtube.com/watch?v=…').max(400).nullable().optional().or(z.literal('').transform(() => null)),
      cover_id: uuidOrNull,
      gallery_ids: z.array(z.string().uuid()).max(60).default([]),
      sort_order: z.number().int().min(0).max(1000).default(0),
      is_published: z.boolean().default(true),
    }),
  },
  team: {
    name: 'team', table: 'team_members', alias: 't', select: TEAM_SELECT, orderBy: 't.sort_order, t.name',
    searchColumns: ['t.name', 't.designation'], tags: ['team'],
    schema: z.object({
      name: z.string().trim().min(2, 'Enter a name.').max(120),
      designation: z.string().trim().min(2, 'Enter a designation.').max(120),
      bio: nullableText(3000),
      responsibilities: nullableText(3000),
      email: z.string().trim().email().max(200).nullable().optional().or(z.literal('').transform(() => null)),
      phone: nullableText(40),
      photo_id: uuidOrNull,
      sort_order: z.number().int().min(0).max(1000).default(0),
      is_published: z.boolean().default(true),
    }),
  },
  resources: {
    name: 'resources', table: 'resources', alias: 'r', select: RESOURCE_SELECT, orderBy: 'r.published_at desc',
    searchColumns: ['r.title', 'r.description'], tags: ['resources'],
    schema: z.object({
      title: z.string().trim().min(3, 'Give the document a title.').max(200),
      description: nullableText(1000),
      category: z.enum(['rules', 'standards', 'framework', 'guidelines', 'forms', 'policies', 'reports', 'publications', 'notices']),
      sport_id: uuidOrNull,
      file_id: z.string().uuid({ message: 'Upload the document file.' }),
      is_featured: z.boolean().default(false),
      is_published: z.boolean().default(true),
      published_at: z.string().datetime({ offset: true }).optional(),
    }),
  },
} satisfies Record<string, EntityConfig<any>>;

export type EntityName = keyof typeof entities;

/** First free slug among root, root-2, root-3… — found with a single query. */
async function uniqueSlug(table: string, base: string, excludeId?: string): Promise<string> {
  const root = base || 'item';
  const rows = await query<{ slug: string }>(
    `select slug from ${table} where (slug = $1 or slug like $2 escape '\\') and ($3::uuid is null or id <> $3)`,
    [root, `${root.replace(/[\\%_]/g, '\\$&')}-%`, excludeId ?? null],
  );
  const taken = new Set(rows.map((r) => r.slug));
  if (!taken.has(root)) return root;
  for (let i = 2; i < 10_000; i++) if (!taken.has(`${root}-${i}`)) return `${root}-${i}`;
  return `${root}-${Date.now()}`;
}

/** True when a write failed only because another row already uses this slug. */
const isSlugClash = (err: unknown) => {
  const e = err as { code?: string; constraint?: string };
  return e?.code === '23505' && typeof e.constraint === 'string' && e.constraint.endsWith('_slug_key');
};

/**
 * Write with the requested slug first (one round trip in the normal case); only if
 * the database reports a clash do we look up a free "-2", "-3"… variant and retry.
 */
async function writeWithSlug<T>(cfg: EntityConfig<any>, data: Record<string, unknown>, id: string | undefined, write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (err) {
    if (!cfg.slugFrom || !isSlugClash(err)) throw err;
    data.slug = await uniqueSlug(cfg.table, String(data.slug), id);
    return write();
  }
}

function prepare(cfg: EntityConfig<any>, data: Record<string, unknown>) {
  if (cfg.slugFrom) data.slug = slugify(String(data.slug || data[cfg.slugFrom] || '')) || 'item';
  if (cfg.name === 'news' && data.status === 'published' && !data.published_at) data.published_at = new Date().toISOString();
  for (const c of cfg.jsonColumns ?? []) if (c in data) data[c] = JSON.stringify(data[c]);
  return data;
}

export function crudRouter(cfg: EntityConfig<any>) {
  const r = Router();
  r.use(requirePermission('content'));
  const { table, alias } = cfg;

  r.get('/', async (req, res) => {
    const { page, pageSize, offset } = pageParams(req, 25, 200);
    const where: string[] = ['true'];
    const params: unknown[] = [];
    const q = str(req.query.q);
    if (q) {
      params.push(`%${q}%`);
      where.push(`(${cfg.searchColumns.map((c) => `${c} ilike $${params.length}`).join(' or ')})`);
    }
    const status = str(req.query.status);
    const sf = status && cfg.statusFilter?.(status);
    if (sf) where.push(sf);
    const w = where.join(' and ');
    const [items, total] = await Promise.all([
      query(`select ${cfg.select} from ${table} ${alias} where ${w} order by ${cfg.orderBy} limit ${pageSize} offset ${offset}`, params),
      one<{ c: number }>(`select count(*)::int as c from ${table} ${alias} where ${w}`, params),
    ]);
    res.json({ items, total: total?.c ?? 0, page, pageSize });
  });

  r.get('/:id', async (req, res) => {
    const item = await one(`select ${cfg.select} from ${table} ${alias} where ${alias}.id = $1`, [req.params.id]);
    if (!item) throw notFound();
    res.json(item);
  });

  r.post('/', async (req, res) => {
    const data = prepare(cfg, parse(cfg.schema, req.body));
    if (cfg.name === 'news') data.author_id = req.user!.id;
    const cols = Object.keys(data);
    // Write and read back the full record in one round trip: the CTE is named after
    // the entity's alias so the shared select list applies to the returned row.
    const row = await writeWithSlug(cfg, data, undefined, () =>
      one<{ id: string }>(
        `with ${alias} as (insert into ${table} (${cols.join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')}) returning *)
         select ${cfg.select} from ${alias}`,
        cols.map((c) => data[c]),
      ),
    );
    void audit(req, `${cfg.name}.create`, cfg.name, row!.id, { title: data.title ?? data.name });
    revalidate(...cfg.tags);
    res.status(201).json(row);
  });

  r.put('/:id', async (req, res) => {
    const id = String(req.params.id);
    const data = prepare(cfg, parse(cfg.schema, req.body));
    const cols = Object.keys(data);
    const row = await writeWithSlug(cfg, data, id, () =>
      one<{ id: string }>(
        `with ${alias} as (update ${table} set ${cols.map((c, i) => `${c} = $${i + 2}`).join(', ')} where id = $1 returning *)
         select ${cfg.select} from ${alias}`,
        [id, ...cols.map((c) => data[c])],
      ),
    );
    if (!row) throw notFound();
    void audit(req, `${cfg.name}.update`, cfg.name, row.id, { title: data.title ?? data.name });
    revalidate(...cfg.tags);
    res.json(row);
  });

  /** Reorder: body = { ids: [...] } in display order. */
  if (['sports', 'team'].includes(cfg.name)) {
    r.post('/reorder', async (req, res) => {
      const { ids } = parse(z.object({ ids: z.array(z.string().uuid()).max(500) }), req.body);
      await query(`update ${table} t set sort_order = x.ord from unnest($1::uuid[]) with ordinality as x(id, ord) where t.id = x.id`, [ids]);
      void audit(req, `${cfg.name}.reorder`, cfg.name);
      revalidate(...cfg.tags);
      res.json({ ok: true });
    });
  }

  r.delete('/:id', async (req, res) => {
    const row = await one<{ id: string }>(`delete from ${table} where id = $1 returning id`, [req.params.id]);
    if (!row) throw notFound();
    void audit(req, `${cfg.name}.delete`, cfg.name, row.id);
    revalidate(...cfg.tags);
    res.status(204).end();
  });

  return r;
}
