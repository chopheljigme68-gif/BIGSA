import { revalidateTag } from 'next/cache';

/**
 * Refreshes the public website's cached pages right after an admin change.
 *
 * The admin panel calls this on its own site (same origin) after every successful
 * save, so updates show up immediately even if the API's server-to-server refresh
 * (WEB_URL + REVALIDATE_SECRET) is misconfigured or the API host is asleep.
 *
 * Security: the caller must be a signed-in admin. The session cookie is checked by
 * the API itself (GET /api/admin/auth/me); the custom header blocks cross-site
 * requests, because browsers can't add it to a form post from another site.
 */
const API_URL = process.env.API_URL ?? 'http://localhost:4000';

// Every cache tag used by src/lib/api.ts. Refreshing them all is cheap: pages are
// only marked stale, and rebuilt on their next visit.
const TAGS = ['home', 'settings', 'sports', 'news', 'events', 'team', 'resources', 'forms', 'gallery', 'search'];

export async function POST(req: Request) {
  if (req.headers.get('x-bigsa-admin') !== '1') {
    return Response.json({ error: 'Not allowed' }, { status: 403 });
  }
  const cookie = req.headers.get('cookie') ?? '';
  if (!cookie.includes('bigsa_admin=')) {
    return Response.json({ error: 'Sign in again' }, { status: 401 });
  }

  const me = await fetch(`${API_URL}/api/admin/auth/me`, {
    headers: { cookie, 'x-bigsa-admin': '1' },
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!me?.ok) {
    return Response.json({ error: 'Sign in again' }, { status: 401 });
  }

  for (const tag of TAGS) revalidateTag(tag);
  return Response.json({ revalidated: TAGS });
}
