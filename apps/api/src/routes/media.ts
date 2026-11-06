/**
 * Serves files stored in Postgres.
 *   GET /media/:id            original (public files only)
 *   GET /media/:id?w=960      nearest pre-sized WebP variant (images)
 *   GET /media/:id?download=1 as an attachment
 * Private files (application attachments) are only served via the admin API.
 */
import { Router, type Response } from 'express';
import { one } from '../db';
import { notFound } from '../lib/http';
import { VARIANT_WIDTHS } from '../lib/media';

export const mediaRouter = Router();

const UUID = /^[0-9a-f-]{36}$/i;

export function sendFile(res: Response, file: { data: Buffer; mime: string; filename: string }, opts: { download?: boolean; cache: string }) {
  const disposition = opts.download ? 'attachment' : 'inline';
  res.set({
    'Content-Type': file.mime,
    'Content-Length': String(file.data.length),
    'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
    'Cache-Control': opts.cache,
    'X-Content-Type-Options': 'nosniff',
    // Even if a hostile file slipped through, it cannot run scripts from our origin.
    'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
  });
  res.end(file.data);
}

mediaRouter.get('/media/:id', async (req, res) => {
  const { id } = req.params;
  if (!UUID.test(id)) throw notFound('File');

  // Media is immutable (a new upload gets a new id), so a one-year cache is safe
  // and no ETag round-trips are needed.
  const w = Number(req.query.w);
  const wantsWebp = Boolean(w) && String(req.headers.accept ?? '').includes('image/webp');
  if (wantsWebp) {
    const target = VARIANT_WIDTHS.find((v) => v >= w) ?? 0;
    const v = await one<{ data: Buffer; filename: string }>(
      `select v.data, m.filename from media_variants v join media m on m.id = v.media_id
       where v.media_id = $1 and m.visibility = 'public' and (v.width = $2 or v.width = 0)
       order by (v.width = $2) desc limit 1`,
      [id, target],
    );
    if (v) {
      res.set('Vary', 'Accept');
      return void sendFile(res, { data: v.data, mime: 'image/webp', filename: v.filename.replace(/\.\w+$/, '.webp') }, { cache: 'public, max-age=31536000, immutable' });
    }
  }

  const file = await one<{ data: Buffer; mime: string; filename: string }>(
    `select data, mime, filename from media where id = $1 and visibility = 'public'`,
    [id],
  );
  if (!file) throw notFound('File');
  res.set('Vary', 'Accept');
  sendFile(res, file, { download: req.query.download === '1', cache: 'public, max-age=31536000, immutable' });
});
