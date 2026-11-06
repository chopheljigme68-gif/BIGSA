/**
 * Applies db/migrations/*.sql in order, once each, inside a transaction.
 * Usage: npm run db:migrate
 */
import fs from 'node:fs';
import path from 'node:path';
import { pool } from '../db';

const dir = path.resolve(__dirname, '../../../../db/migrations');

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`);
    // Serialise concurrent deploys.
    await client.query(`select pg_advisory_lock(7362001)`);
    const done = new Set((await client.query<{ name: string }>(`select name from schema_migrations`)).rows.map((r) => r.name));
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      if (done.has(file)) continue;
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      process.stdout.write(`applying ${file} … `);
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query(`insert into schema_migrations (name) values ($1)`, [file]);
        await client.query('commit');
        console.log('done');
      } catch (err) {
        await client.query('rollback');
        throw err;
      }
    }
    console.log('Database is up to date.');
  } finally {
    await client.query(`select pg_advisory_unlock(7362001)`).catch(() => {});
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
