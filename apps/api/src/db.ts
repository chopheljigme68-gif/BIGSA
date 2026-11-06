import pg from 'pg';
import { config } from './config';

// Return timestamps as ISO strings and bigints/numerics as numbers where safe.
pg.types.setTypeParser(1184, (v) => new Date(v).toISOString()); // timestamptz
pg.types.setTypeParser(1082, (v) => v); // date
pg.types.setTypeParser(20, (v) => Number(v)); // int8 (counts)

function sslConfig(): pg.PoolConfig['ssl'] {
  if (config.databaseSsl === 'disable') return false;
  if (config.databaseCaCert) return { ca: config.databaseCaCert, rejectUnauthorized: true };
  // Supabase's pooler presents a certificate chained to its own CA. Provide
  // DATABASE_CA_CERT (Supabase dashboard → Database → SSL) to verify it fully.
  return { rejectUnauthorized: false };
}

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: sslConfig(),
  max: Number(process.env.DATABASE_POOL_MAX ?? 10),
  // Opening a TLS connection to Supabase costs several round trips, so keep idle
  // connections for 10 minutes instead of re-connecting after every pause.
  idleTimeoutMillis: 600_000,
  connectionTimeoutMillis: 10_000,
  keepAlive: true,
});

pool.on('error', (err) => console.error('[db] idle client error', err.message));

export async function query<T extends pg.QueryResultRow = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool.query<T>(text, params);
  return res.rows;
}

export async function one<T extends pg.QueryResultRow = any>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Run fn inside a transaction; rolls back on any thrown error. */
export async function tx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (err) {
    await client.query('rollback').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
