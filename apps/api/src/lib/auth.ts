import type { RequestHandler, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { can, type Permission, type Role } from '@bigsa/shared';
import { config } from '../config';
import { one } from '../db';
import { HttpError, forbidden } from './http';

export const SESSION_COOKIE = 'bigsa_admin';
/** Mutating admin requests must carry this header. Browsers can't add it cross-site, so it doubles as CSRF protection alongside SameSite=Strict. */
export const CSRF_HEADER = 'x-bigsa-admin';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AdminUser;
    }
  }
}

interface TokenPayload { sub: string; v: number }

export function issueSession(res: Response, user: { id: string; token_version: number }) {
  const token = jwt.sign({ sub: user.id, v: user.token_version } satisfies TokenPayload, config.jwtSecret, {
    expiresIn: `${config.sessionHours}h`,
    issuer: 'bigsa-api',
    audience: 'bigsa-admin',
  });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'strict',
    path: '/',
    maxAge: config.sessionHours * 3600 * 1000,
  });
}

export function clearSession(res: Response) {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: config.isProd, sameSite: 'strict', path: '/' });
}

async function userFromRequest(req: Request): Promise<AdminUser | null> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, config.jwtSecret, { issuer: 'bigsa-api', audience: 'bigsa-admin' }) as TokenPayload;
  } catch {
    return null;
  }
  // The account is re-checked against the database at most every SESSION_CACHE_MS,
  // so deactivating a user or bumping token_version (password change, "sign out
  // everywhere") still takes effect within seconds, without a DB round trip on
  // every single admin request.
  const key = `${payload.sub}:${payload.v}`;
  const hit = sessionCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.user;
  const user = await one<AdminUser>(
    `select id, email, name, role from admin_users where id = $1 and is_active and token_version = $2`,
    [payload.sub, payload.v],
  );
  if (user) sessionCache.set(key, { user, expires: Date.now() + SESSION_CACHE_MS });
  else sessionCache.delete(key);
  return user;
}

const SESSION_CACHE_MS = 30_000;
const sessionCache = new Map<string, { user: AdminUser; expires: number }>();

/** Call after changing any admin account so the change applies immediately on this server. */
export function forgetSessions() {
  sessionCache.clear();
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  const user = await userFromRequest(req);
  if (!user) {
    // Expired, signed with an old secret, or the account changed: delete the cookie
    // so the browser stops presenting a session that can never work.
    if (req.cookies?.[SESSION_COOKIE]) clearSession(res);
    return next(new HttpError(401, 'Sign in to continue.'));
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get(CSRF_HEADER) !== '1') {
    return next(forbidden('Request blocked: missing admin header.'));
  }
  req.user = user;
  next();
};

export const requirePermission = (p: Permission): RequestHandler => (req, _res, next) => {
  if (!can(req.user?.role, p)) return next(forbidden());
  next();
};
