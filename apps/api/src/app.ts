import express from 'express';
import { isIP } from 'node:net';
import { timingSafeEqual } from 'node:crypto';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { pool } from './db';
import { errorHandler, notFoundHandler } from './lib/http';
import { requireAuth } from './lib/auth';
import { publicRouter } from './routes/public';
import { mediaRouter } from './routes/media';
import { authRouter } from './routes/admin/auth';
import { crudRouter, entities } from './routes/admin/crud';
import { formsRouter } from './routes/admin/forms';
import { systemRouter } from './routes/admin/system';

export function createApp() {
  const app = express();

  // The API sits behind the Next.js apps (which proxy /api and /media) and
  // usually a load balancer; trust only the configured number of hops.
  app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');

  // The website forwards each visitor's address, signed with the shared secret
  // (apps/web/src/middleware.ts). Use it for rate limits and IP hashing only when
  // the signature matches; anything else is ignored, so it can't be spoofed.
  app.use((req, _res, next) => {
    const given = req.get('x-bigsa-proxy');
    const ip = req.get('x-bigsa-client-ip')?.trim();
    if (given && ip && config.revalidateSecret && isIP(ip) && safeEqual(given, config.revalidateSecret)) {
      Object.defineProperty(req, 'ip', { value: ip, configurable: true, enumerable: true });
    }
    next();
  });

  app.use(helmet({
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    crossOriginResourcePolicy: { policy: 'same-site' },
  }));
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '256kb' }));

  app.get('/health', async (_req, res) => {
    await pool.query('select 1');
    res.json({ ok: true, time: new Date().toISOString() });
  });

  app.use(mediaRouter);
  app.use('/api', publicRouter);

  // ---- admin (separate prefix, always authenticated except sign-in)
  const admin = express.Router();
  admin.use((_req, res, next) => {
    res.set('Cache-Control', 'private, no-store');
    next();
  });
  admin.use('/auth', authRouter);
  admin.use(requireAuth);
  for (const cfg of Object.values(entities)) admin.use(`/${cfg.name}`, crudRouter(cfg));
  admin.use(formsRouter);
  admin.use(systemRouter);
  app.use('/api/admin', admin);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
