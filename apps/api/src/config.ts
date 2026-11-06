/** Environment configuration. Fails fast on anything missing or unsafe. */
// Treat empty values (e.g. `JWT_SECRET=` copied from .env.example) as unset.
const env: Record<string, string | undefined> = Object.fromEntries(
  Object.entries(process.env).map(([k, v]) => [k, v?.trim() ? v.trim() : undefined]),
);
const isProd = env.NODE_ENV === 'production';

function required(name: string): string {
  const v = env[name];
  if (!v) throw new Error(`Missing required environment variable ${name}. See .env.example.`);
  return v;
}

/** Must match apps/web/src/app/api/revalidate/route.ts. Development only. */
const DEV_REVALIDATE_SECRET = 'bigsa-dev-revalidate-secret';

const jwtSecret = env.JWT_SECRET ?? (isProd ? '' : 'dev-only-insecure-secret-change-me-0123456789');

/**
 * Checks needed only by the running API server (sign-in sessions).
 * Scripts such as migrate/seed don't need a JWT secret, so they don't call this.
 */
export function assertServerConfig() {
  if (jwtSecret.length < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters. Generate one with:\n' +
        `  node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`,
    );
  }
}

export const config = {
  isProd,
  port: Number(env.API_PORT ?? env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL'),
  /** 'require' (default for remote hosts), 'disable' for local Postgres. */
  databaseSsl: env.DATABASE_SSL ?? (/localhost|127\.0\.0\.1/.test(env.DATABASE_URL ?? '') ? 'disable' : 'require'),
  databaseCaCert: env.DATABASE_CA_CERT?.replace(/\\n/g, '\n'),
  jwtSecret,
  sessionHours: Number(env.ADMIN_SESSION_HOURS ?? 8),
  ipHashSalt: env.IP_HASH_SALT ?? jwtSecret,
  /** Public site URL — used in emails and for on-demand revalidation. */
  webUrl: env.WEB_URL ?? 'http://localhost:3000',
  /** The admin panel lives on the same site at /admin. */
  adminUrl: `${env.WEB_URL ?? 'http://localhost:3000'}/admin`,
  /** In development both apps fall back to the same built-in value, so edits show up on the local site at once. */
  revalidateSecret: env.REVALIDATE_SECRET ?? (isProd ? '' : DEV_REVALIDATE_SECRET),
  /** Trust X-Forwarded-For from this many proxies (Vercel/Render/NGINX = 1). */
  trustProxy: Number(env.TRUST_PROXY ?? 1),
  upload: {
    maxFileMB: Number(env.UPLOAD_MAX_FILE_MB ?? 10),
    maxAdminFileMB: Number(env.UPLOAD_MAX_ADMIN_FILE_MB ?? 25),
  },
  mail: {
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT ?? 587),
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.MAIL_FROM ?? 'BIGSA <no-reply@bigsa.bt>',
    notify: (env.MAIL_NOTIFY ?? 'bigsabt@gmail.com').split(',').map((s) => s.trim()).filter(Boolean),
  },
};
