/**
 * Seeds a fresh database with BIGSA's initial content.
 *
 *   npm run db:seed                 initial content (skips if already seeded)
 *   npm run db:seed -- --demo       also add sample news and events for review (remove before launch)
 *   npm run db:seed -- --sql out.sql  write the seed as SQL instead of running it (for psql / Supabase SQL editor)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { storeFile, type Queryable } from '../lib/media';
import { SPORTS, RULE_DOCUMENTS } from '../seed/sports';
import { SETTINGS, FORMS } from '../seed/content';
import { DEMO_NEWS, DEMO_EVENTS } from '../seed/demo';

const seedDir = path.resolve(__dirname, '../../../../db/seed');

/** Accessible descriptions for the seeded photographs. */
const ALT: Record<string, string> = {
  'archery-range-shot': 'Archers in gho waiting their turn on a Bacho as one draws his bow',
  'archery-archer-aiming': 'An archer in a black gho stands side-on to the target, bow in hand',
  'archery-release': 'An archer in a red gho draws a bamboo bow towards the far target',
  'archery-range-wide': 'A wide view of an archery range with archers and spectators',
  'archery-at-the-target-end': 'Archers at the target end of the range beside the painted target',
  'archery-follow-through': 'An archer in a red gho at full draw, team-mates behind him on the range',
  'archery-match-in-play': 'Archers in action during a match, prayer flags behind them',
  'archery-arrows': 'A pair of traditional bamboo arrows laid on a board',
  'archery-arrow-fletches': 'Close-up of white arrow fletches',
  'archery-arrow-nocks': 'Close-up of arrow nocks and pang bindings',
  'archery-bamboo-shafts': 'A bundle of bamboo arrow shafts on the grass',
  'archery-arrow-point': 'A copper arrow point',
  'archery-bow-tabzhu': 'A tabzhu bow made of two bamboo staves bound together',
  'archery-bow-string': 'A coiled bow string',
  'archery-bow-strung': 'A strung bamboo bow',
  'archery-finger-tabs': 'Three leather finger tabs',
  'archery-arm-guard': 'A black leather arm guard with buttons',
  'archery-target': 'A traditional archery target painted with rainbow rings around the Gorthig',
  'archery-target-with-gibsi': 'A target dressed with Gibsi and coloured Kachu flags',
  'archery-team-dachham': 'Archers performing Dachham after a team-mate hits the target',
  'archery-dha-kha-lok': 'Team members walking down the range together',
  'archery-dachham-singers': 'Women singers cheering as an archer celebrates',
  'archery-victory-celebration': 'Archers celebrating a win, one carried shoulder-high',
  'archery-winning-team': 'The winning team dancing on the range under prayer flags',
  'khuru-throw': 'A woman in a kira throws a khuru on an open field',
  'khuru-darts': 'Two wooden khurus with white flights',
  'khuru-target': 'A small painted khuru target',
  'khuru-target-with-kachu': 'A khuru target dressed with Kachu flags',
  'khuru-players': 'Women khuru players in kira on the field',
  'khuru-team': 'A khuru team lined up at the end of the field',
  'khuru-dachham': 'Khuru players dancing in celebration',
  'doegor-stones': 'Two disc-shaped doegor stones',
  'doegor-match': 'Players pitching doegor stones on an open ground ringed by flags',
  'doegor-players': 'Doegor players gathered by the Tsey between tall flag poles',
};

/** Photos shown in the home-page gallery strip. */
const GALLERY = new Set([
  'archery-follow-through', 'archery-release', 'archery-team-dachham', 'archery-winning-team', 'archery-victory-celebration',
  'archery-target-with-gibsi', 'khuru-throw', 'khuru-players', 'khuru-dachham', 'doegor-match', 'doegor-players', 'archery-dachham-singers',
]);

/** Records statements as plain SQL with literals inlined — for `--sql`. */
class SqlRecorder implements Queryable {
  out: string[] = ['begin;'];
  static lit(v: unknown): string {
    if (v === null || v === undefined) return 'null';
    if (Buffer.isBuffer(v)) return `'\\x${v.toString('hex')}'::bytea`;
    if (typeof v === 'number' || typeof v === 'bigint') return String(v);
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (Array.isArray(v)) return `array[${v.map(SqlRecorder.lit).join(',')}]::text[]`;
    return `'${String(v).replace(/'/g, "''")}'`;
  }
  query = (async (text: string, params: unknown[] = []) => {
    const sql = text.replace(/\$(\d+)/g, (_, n) => SqlRecorder.lit(params[Number(n) - 1]));
    this.out.push(sql.trim() + ';');
    return { rows: [], rowCount: 0 };
  }) as unknown as Queryable['query'];
}

export async function seed(db: Queryable, opts: { demo: boolean }) {
  const ids = new Map<string, string>(); // seed filename -> media id
  const mediaFiles = fs.readdirSync(path.join(seedDir, 'media')).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
  for (const file of mediaFiles) {
    const key = file.replace(/\.\w+$/, '');
    const m = await storeFile(
      { originalname: file, buffer: fs.readFileSync(path.join(seedDir, 'media', file)) },
      { visibility: 'public', alt: ALT[key] ?? null, credit: 'BIGSA', inGallery: GALLERY.has(key) },
      db,
    );
    ids.set(file, m.id);
    process.stdout.write('.');
  }
  console.log(` ${mediaFiles.length} photos`);

  for (const [key, value] of Object.entries(SETTINGS)) {
    await db.query(`insert into site_settings (key, value) values ($1, $2) on conflict (key) do nothing`, [key, JSON.stringify(value)]);
  }

  const sportIds = new Map<string, string>();
  for (const [i, s] of SPORTS.entries()) {
    const id = crypto.randomUUID();
    sportIds.set(s.slug, id);
    const equipment = (s.equipment ?? []).map(({ image, ...e }) => ({ ...e, image_id: image ? ids.get(image) ?? null : null }));
    await db.query(
      `insert into sports (id, slug, name, name_dz, tagline, summary, history, how_to_play, cultural_significance, facts, scoring, equipment, rules, cover_id, gallery_ids, sort_order)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::uuid[],$16)`,
      [id, s.slug, s.name, s.name_dz ?? null, s.tagline ?? null, s.summary ?? null, s.history ?? null, s.how_to_play ?? null, s.cultural_significance ?? null,
        JSON.stringify(s.facts ?? []), JSON.stringify(s.scoring ?? []), JSON.stringify(equipment), JSON.stringify(s.rules ?? []),
        s.cover ? ids.get(s.cover) ?? null : null, (s.gallery ?? []).map((g) => ids.get(g)).filter(Boolean), (i + 1) * 10],
    );
  }
  console.log(`${SPORTS.length} sports`);

  for (const doc of RULE_DOCUMENTS) {
    const file = await storeFile({ originalname: doc.file, buffer: fs.readFileSync(path.join(seedDir, 'files', doc.file)) }, { visibility: 'public', allowed: ['pdf'] }, db);
    await db.query(
      `insert into resources (title, description, category, sport_id, file_id, is_featured) values ($1,$2,$3,$4,$5,true)`,
      [doc.title, doc.description, doc.category, sportIds.get(doc.sport) ?? null, file.id],
    );
  }
  console.log(`${RULE_DOCUMENTS.length} documents`);

  for (const [i, f] of FORMS.entries()) {
    await db.query(
      `insert into forms (slug, title, summary, category, instructions, eligibility, requirements, faq, definition, is_active, ref_prefix, sort_order, contact_note)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10,$11,$12)`,
      [f.slug, f.title, f.summary, f.category, f.instructions, f.eligibility, f.requirements, JSON.stringify(f.faq), JSON.stringify(f.definition), f.ref_prefix, (i + 1) * 10,
        'For help with an application, call +975 2 332834 or email bigsabt@gmail.com.'],
    );
  }
  console.log(`${FORMS.length} forms`);

  if (opts.demo) {
    for (const n of DEMO_NEWS) {
      await db.query(
        `insert into news (slug, title, excerpt, body, category, sport_id, cover_id, is_featured, status, published_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,'published', now() - ($9 || ' days')::interval)`,
        [n.slug, n.title, n.excerpt, n.body, n.category, n.sport ? sportIds.get(n.sport) ?? null : null, n.cover ? ids.get(n.cover) ?? null : null, n.featured ?? false, String(n.daysAgo)],
      );
    }
    for (const e of DEMO_EVENTS) {
      await db.query(
        `insert into events (slug, title, summary, body, venue, starts_at, ends_at, results, sport_id, cover_id, gallery_ids)
         values ($1,$2,$3,$4,$5, date_trunc('day', now()) + ($6 || ' days')::interval + interval '2 hours 30 minutes',
                 date_trunc('day', now()) + ($7 || ' days')::interval + interval '11 hours', $8, $9, $10, $11::uuid[])`,
        [e.slug, e.title, e.summary, e.body, e.venue, String(e.startDay), String(e.endDay), e.results ?? null, sportIds.get(e.sport) ?? null,
          ids.get(e.cover) ?? null, (e.gallery ?? []).map((g) => ids.get(g)).filter(Boolean)],
      );
    }
    console.log(`demo: ${DEMO_NEWS.length} news, ${DEMO_EVENTS.length} events`);
  }
}

async function main() {
  const demo = process.argv.includes('--demo');
  const sqlOut = process.argv.includes('--sql') ? process.argv[process.argv.indexOf('--sql') + 1] : null;

  if (sqlOut) {
    const rec = new SqlRecorder();
    await seed(rec, { demo });
    rec.out.push('commit;');
    fs.writeFileSync(sqlOut, rec.out.join('\n'));
    console.log(`Wrote ${sqlOut}`);
    return;
  }

  // Loaded only here, so `--sql` mode works without a DATABASE_URL.
  const { pool, tx } = await import('../db.js');
  const existing = await pool.query(`select count(*)::int as c from sports`);
  if (existing.rows[0].c > 0 && !process.argv.includes('--force')) {
    console.log('Database already has content; nothing seeded. (Use --force on an empty database only.)');
    await pool.end();
    return;
  }
  await tx((client) => seed(client, { demo }));
  console.log('Seed complete.');
  await pool.end();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
