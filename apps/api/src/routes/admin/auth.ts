import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { one, query } from '../../db';
import { parse, HttpError } from '../../lib/http';
import { issueSession, clearSession, requireAuth, forgetSessions } from '../../lib/auth';
import { audit } from '../../lib/services';

export const authRouter = Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many sign-in attempts. Wait 15 minutes and try again.' } });

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;
// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

export const PASSWORD_RULE = z
  .string()
  .min(12, 'Use at least 12 characters.')
  .max(200)
  .refine((p) => /[a-z]/i.test(p) && /\d/.test(p), 'Use letters and at least one number.');

authRouter.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = parse(z.object({ email: z.string().trim().email('Enter your email address.'), password: z.string().min(1, 'Enter your password.').max(200) }), req.body);
  const user = await one<{ id: string; name: string; email: string; role: string; password_hash: string; is_active: boolean; failed_logins: number; locked_until: string | null; token_version: number }>(
    `select id, name, email, role, password_hash, is_active, failed_logins, locked_until, token_version from admin_users where lower(email) = lower($1)`,
    [email],
  );
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  const generic = new HttpError(401, 'That email and password don’t match an active account.');

  if (!user || !user.is_active) throw generic;
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    throw new HttpError(423, `This account is locked after too many failed attempts. Try again after ${new Date(user.locked_until).toLocaleTimeString('en-GB', { timeZone: 'Asia/Thimphu', hour: '2-digit', minute: '2-digit' })}.`);
  }
  if (!ok) {
    const failures = user.failed_logins + 1;
    await query(
      `update admin_users set failed_logins = $2, locked_until = case when $2 >= ${MAX_FAILURES} then now() + interval '${LOCK_MINUTES} minutes' else null end where id = $1`,
      [user.id, failures],
    );
    req.user = { id: user.id, name: user.name, email: user.email, role: user.role as never };
    await audit(req, 'auth.login_failed', 'admin_users', user.id);
    throw generic;
  }
  await query(`update admin_users set failed_logins = 0, locked_until = null, last_login_at = now() where id = $1`, [user.id]);
  issueSession(res, user);
  req.user = { id: user.id, name: user.name, email: user.email, role: user.role as never };
  await audit(req, 'auth.login', 'admin_users', user.id);
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

authRouter.post('/logout', (_req, res) => {
  clearSession(res);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

authRouter.post('/password', requireAuth, async (req, res) => {
  const { current, next } = parse(z.object({ current: z.string().min(1, 'Enter your current password.'), next: PASSWORD_RULE }), req.body);
  const row = await one<{ password_hash: string }>(`select password_hash from admin_users where id = $1`, [req.user!.id]);
  if (!row || !(await bcrypt.compare(current, row.password_hash))) throw new HttpError(400, 'Your current password is not correct.', { current: 'Not correct.' });
  const hash = await bcrypt.hash(next, 12);
  // Bumping token_version signs out every other session.
  const user = await one<{ id: string; token_version: number }>(
    `update admin_users set password_hash = $2, token_version = token_version + 1 where id = $1 returning id, token_version`,
    [req.user!.id, hash],
  );
  issueSession(res, user!);
  forgetSessions();
  await audit(req, 'auth.password_changed', 'admin_users', req.user!.id);
  res.json({ ok: true });
});
