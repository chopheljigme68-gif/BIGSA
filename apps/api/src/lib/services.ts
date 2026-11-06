/** Small cross-cutting services: email, audit trail, cache revalidation, spam checks. */
import crypto from 'node:crypto';
import type { Request } from 'express';
import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config';
import { query } from '../db';
import { badRequest } from './http';

// ---------------------------------------------------------------- email
let transporter: Transporter | null = null;
if (config.mail.host) {
  transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.port === 465,
    auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
  });
}

export async function sendMail(to: string | string[], subject: string, text: string): Promise<void> {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!recipients.length) return;
  if (!transporter) {
    console.info(`[mail] SMTP not configured — would send "${subject}" to ${recipients.join(', ')}`);
    return;
  }
  try {
    await transporter.sendMail({ from: config.mail.from, to: recipients, subject, text });
  } catch (err) {
    // Email failure must never lose a submission; it is logged for follow-up.
    console.error('[mail] send failed', subject, (err as Error).message);
  }
}

/**
 * Send an email after the response has gone out. On Vercel, a function is frozen
 * as soon as it responds, so un-awaited work is registered with the platform's
 * waitUntil to make sure it finishes. On a normal Node server it just runs.
 */
export function sendMailLater(to: string | string[], subject: string, text: string): void {
  background(sendMail(to, subject, text));
}

// ---------------------------------------------------------------- background work
/** Keep the serverless function alive until `task` settles (no-op off Vercel). */
export function background(task: Promise<unknown>): void {
  const ctx = (globalThis as unknown as Record<symbol, { get?: () => { waitUntil?: (p: Promise<unknown>) => void } } | undefined>)[
    Symbol.for('@vercel/request-context')
  ]?.get?.();
  ctx?.waitUntil?.(task.catch(() => undefined));
}

// ---------------------------------------------------------------- audit
/**
 * Record an admin action. The write runs in the background so it never adds a
 * database round trip to the admin's save; a failure is logged, never shown.
 */
export async function audit(req: Request, action: string, entity?: string, entityId?: string | string[] | null, detail?: unknown): Promise<void> {
  // Express 5 types route params as string | string[] (wildcards can repeat).
  const id = Array.isArray(entityId) ? entityId[0] : entityId;
  background(
    query(
      `insert into audit_log (actor_id, actor_name, action, entity, entity_id, detail, ip) values ($1,$2,$3,$4,$5,$6,$7)`,
      [req.user?.id ?? null, req.user?.name ?? null, action, entity ?? null, id ?? null, detail ? JSON.stringify(detail) : null, ipHash(req)],
    ).catch((err) => console.error('[audit] failed', err.message)),
  );
}

// ---------------------------------------------------------------- revalidation
/** Ask the public Next.js site to refresh cached pages for these tags. Fire-and-forget. */
export function revalidate(...tags: string[]) {
  if (!config.revalidateSecret) return;
  background(
    fetch(`${config.webUrl}/api/revalidate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-revalidate-secret': config.revalidateSecret },
      body: JSON.stringify({ tags: [...new Set([...tags, 'home', 'search'])] }),
      signal: AbortSignal.timeout(5000),
    })
      .then((r) => {
        if (!r.ok) console.warn(`[revalidate] ${config.webUrl} answered ${r.status}; check WEB_URL and REVALIDATE_SECRET match on both apps`);
      })
      .catch((err) => console.warn(`[revalidate] could not reach ${config.webUrl}: ${err.message}`)),
  );
}

// ---------------------------------------------------------------- spam & privacy
/** One-way, salted hash of the client IP: enough to rate-limit and spot abuse, without storing the IP. */
export function ipHash(req: Request): string {
  return crypto.createHmac('sha256', config.ipHashSalt).update(req.ip ?? '').digest('hex').slice(0, 32);
}

/**
 * Bot checks for public forms:
 *  - `website` is a honeypot field hidden from people; bots fill it in.
 *  - `_t` is when the form was rendered (ms epoch). Submissions faster than
 *    3 seconds, or older than a day, are not from a person filling the form.
 */
export function assertHuman(body: Record<string, unknown>) {
  if (typeof body.website === 'string' && body.website.trim() !== '') throw badRequest('Submission blocked.');
  const t = Number(body._t);
  const age = Date.now() - t;
  if (!Number.isFinite(t) || age < 3000 || age > 24 * 3600 * 1000) {
    throw badRequest('Please reload the page and try again.');
  }
}
