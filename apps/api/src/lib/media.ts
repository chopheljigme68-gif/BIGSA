/**
 * File storage in Postgres.
 *
 * Every upload is checked against its real content (magic bytes), not the
 * extension or the browser-supplied MIME type, so executables or scripts
 * renamed to .pdf/.jpg are rejected. Raster images are re-encoded through
 * sharp, which strips EXIF/GPS metadata and anything appended to the file,
 * and pre-sized WebP variants are stored for fast delivery on slow networks.
 */
import crypto from 'node:crypto';
import type pg from 'pg';
import sharp from 'sharp';
import { pool } from '../db';
import { badRequest } from './http';

export const VARIANT_WIDTHS = [480, 960, 1600] as const;

type Kind = 'jpg' | 'png' | 'webp' | 'gif' | 'pdf' | 'docx' | 'doc' | 'xlsx' | 'svg';

const MIME: Record<Kind, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  doc: 'application/msword',
  svg: 'image/svg+xml',
};

const startsWith = (buf: Buffer, bytes: number[], offset = 0) => bytes.every((b, i) => buf[offset + i] === b);

/** Detect the real file type from its first bytes. */
export function sniff(buf: Buffer, filename: string): Kind | null {
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return 'jpg';
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) return 'webp';
  if (startsWith(buf, [0x47, 0x49, 0x46, 0x38])) return 'gif';
  if (startsWith(buf, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'pdf';
  if (startsWith(buf, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'doc';
  if (startsWith(buf, [0x50, 0x4b, 0x03, 0x04])) {
    // OOXML is a zip; the first entry name tells us which kind.
    const head = buf.subarray(0, 2000).toString('latin1');
    if (head.includes('word/') || /\.docx$/i.test(filename)) return 'docx';
    if (head.includes('xl/') || /\.xlsx$/i.test(filename)) return 'xlsx';
    return null; // arbitrary zip archives are not accepted
  }
  return null;
}

const EXT_TO_KIND: Record<string, Kind> = { jpg: 'jpg', jpeg: 'jpg', png: 'png', webp: 'webp', gif: 'gif', pdf: 'pdf', doc: 'doc', docx: 'docx', xlsx: 'xlsx' };

export interface StoreOptions {
  visibility: 'public' | 'private';
  allowed?: string[]; // extensions; defaults to images + documents
  alt?: string | null;
  caption?: string | null;
  credit?: string | null;
  inGallery?: boolean;
  uploadedBy?: string | null;
}

export interface StoredMedia { id: string; filename: string; mime: string; size: number; width: number | null; height: number | null }

function safeFilename(name: string): string {
  const base = name.replace(/[/\\?%*:|"<>\x00-\x1f]/g, '_').replace(/\s+/g, ' ').trim();
  return (base || 'file').slice(-120);
}

/** Anything with pg's query signature (Pool, PoolClient, or the seed's SQL recorder). */
export type Queryable = Pick<pg.Pool, 'query'>;

export async function storeFile(
  file: { originalname: string; buffer: Buffer },
  opts: StoreOptions & { id?: string },
  client: Queryable = pool,
): Promise<StoredMedia> {
  const allowed = (opts.allowed ?? ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx']).map((a) => EXT_TO_KIND[a.toLowerCase()]).filter(Boolean);
  const kind = sniff(file.buffer, file.originalname);
  if (!kind || !allowed.includes(kind)) {
    throw badRequest(`${file.originalname} is not an accepted file type.`, { file: 'Upload a PDF, Word document or image.' });
  }

  let data = file.buffer;
  let width: number | null = null;
  let height: number | null = null;
  let mime = MIME[kind];
  let filename = safeFilename(file.originalname);
  const variants: { width: number; data: Buffer }[] = [];

  if (kind === 'jpg' || kind === 'png' || kind === 'webp' || kind === 'gif') {
    let img = sharp(file.buffer, { failOn: 'error' }).rotate(); // apply EXIF orientation, then drop metadata
    const meta = await img.metadata().catch(() => {
      throw badRequest(`${file.originalname} is not a readable image.`);
    });
    if ((meta.width ?? 0) > 2400 || (meta.height ?? 0) > 2400) img = img.resize({ width: 2400, height: 2400, fit: 'inside' });
    if (kind === 'png' && meta.hasAlpha) {
      data = await img.png({ compressionLevel: 9 }).toBuffer();
    } else {
      data = await img.jpeg({ quality: 84, mozjpeg: true }).toBuffer();
      mime = 'image/jpeg';
      filename = filename.replace(/\.(png|webp|gif|jpeg)$/i, '.jpg');
    }
    const out = await sharp(data).metadata();
    width = out.width ?? null;
    height = out.height ?? null;

    if (opts.visibility === 'public') {
      // Encode all sizes at once; sharp runs them on its own thread pool.
      const src = data;
      const widths = VARIANT_WIDTHS.filter((w) => !width || w < width);
      variants.push(
        ...(await Promise.all([
          ...widths.map(async (w) => ({ width: w, data: await sharp(src).resize({ width: w }).webp({ quality: 72 }).toBuffer() })),
          (async () => ({ width: 0, data: await sharp(src).webp({ quality: 76 }).toBuffer() }))(), // full-size WebP
        ])),
      );
    }
  }

  const sha256 = crypto.createHash('sha256').update(data).digest('hex');
  const media: StoredMedia = { id: opts.id ?? crypto.randomUUID(), filename, mime, size: data.length, width, height };
  await client.query(
    `insert into media (id, filename, mime, size, width, height, alt, caption, credit, visibility, in_gallery, sha256, data, uploaded_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [media.id, filename, mime, data.length, width, height, opts.alt ?? null, opts.caption ?? null, opts.credit ?? null, opts.visibility, opts.inGallery ?? false, sha256, data, opts.uploadedBy ?? null],
  );
  if (variants.length) {
    // One statement for all sizes instead of one round trip each.
    await client.query(
      `insert into media_variants (media_id, width, mime, size, data) values ${variants.map((_, i) => `($1, $${i * 3 + 2}, 'image/webp', $${i * 3 + 3}, $${i * 3 + 4})`).join(', ')}`,
      [media.id, ...variants.flatMap((v) => [v.width, v.data.length, v.data])],
    );
  }
  return media;
}
