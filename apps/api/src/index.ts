import { createApp } from './app';
import { config, assertServerConfig } from './config';
import { pool } from './db';

assertServerConfig();

const server = createApp().listen(config.port, () => {
  console.info(`[api] listening on http://localhost:${config.port} (${config.isProd ? 'production' : 'development'})`);
  // Open a couple of database connections now, so the first admin action doesn't wait for them.
  void Promise.all([pool.query('select 1'), pool.query('select 1')]).catch((err) => console.warn('[db] warm-up failed', err.message));
});

async function shutdown(signal: string) {
  console.info(`[api] ${signal} received, shutting down`);
  server.close(() => pool.end().finally(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
