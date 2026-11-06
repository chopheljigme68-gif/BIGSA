// Share the repo-root .env with the API in local development (hosts set env vars directly).
try {
  process.loadEnvFile(new URL('../../.env', import.meta.url).pathname);
} catch {
  /* no root .env — rely on the environment */
}

/** @type {import('next').NextConfig} */
const API_URL = process.env.API_URL ?? 'http://localhost:4000';
const isDev = process.env.NODE_ENV !== 'production';

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  'frame-src https://www.openstreetmap.org https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com',
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@bigsa/shared'],
  experimental: {
    // An open tab reuses pages it has already visited for 5 minutes by default, so
    // a visitor (or an admin checking their edit) could be shown the old version.
    // 30 seconds is the shortest Next.js allows.
    staleTimes: { dynamic: 0, static: 30 },
  },
  // Browsers only ever talk to this origin; the API stays private behind it.
  // /api/admin/* is used by the admin panel at /admin (session cookie, same origin).
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_URL}/api/:path*` },
      { source: '/media/:path*', destination: `${API_URL}/media/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
      {
        // Keep the admin panel out of search engines and caches.
        source: '/admin/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'private, no-store' },
        ],
      },
    ];
  },
};

export default nextConfig;
