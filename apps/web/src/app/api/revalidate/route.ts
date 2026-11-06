import { revalidateTag } from 'next/cache';
import { timingSafeEqual } from 'node:crypto';

/** Called by the API after an admin publishes, so the public site updates immediately. */
export async function POST(req: Request) {
  // Development falls back to the same built-in value as the API (apps/api/src/config.ts).
  const secret = process.env.REVALIDATE_SECRET?.trim() || (process.env.NODE_ENV !== 'production' ? 'bigsa-dev-revalidate-secret' : '');
  const given = req.headers.get('x-revalidate-secret') ?? '';
  const ok = secret.length > 0 && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return Response.json({ error: 'Not allowed' }, { status: 401 });
  const { tags } = (await req.json().catch(() => ({}))) as { tags?: string[] };
  const valid = (tags ?? []).filter((t) => /^[a-z]+$/.test(t)).slice(0, 20);
  for (const t of valid) revalidateTag(t);
  return Response.json({ revalidated: valid });
}
