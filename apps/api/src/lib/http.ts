import type { ErrorRequestHandler, RequestHandler, Request } from 'express';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import multer from 'multer';

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: Record<string, string>) {
    super(message);
  }
}

export const badRequest = (msg: string, details?: Record<string, string>) => new HttpError(400, msg, details);
export const notFound = (what = 'Page') => new HttpError(404, `${what} not found.`);
export const forbidden = (msg = 'You don’t have permission to do that.') => new HttpError(403, msg);

/** Parse and validate req.body (or another source) with a zod schema. */
export function parse<S extends ZodTypeAny>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw zodToHttp(result.error);
  return result.data;
}

function zodToHttp(err: ZodError): HttpError {
  const details: Record<string, string> = {};
  for (const issue of err.issues) details[issue.path.join('.') || '_'] = issue.message;
  return badRequest('Some fields need attention.', details);
}

export function pageParams(req: Request, defaultSize = 20, maxSize = 100) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(maxSize, Math.max(1, Number(req.query.pageSize) || defaultSize));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

export const notFoundHandler: RequestHandler = (_req, _res, next) => next(notFound('Endpoint'));

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }
  if (err instanceof ZodError) {
    const e = zodToHttp(err);
    res.status(400).json({ error: e.message, details: e.details });
    return;
  }
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'A file is larger than the size limit.' : err.code === 'LIMIT_FILE_COUNT' ? 'Too many files attached.' : 'The upload could not be read.';
    res.status(400).json({ error: msg });
    return;
  }
  // Postgres unique violation → friendly 409
  if (err?.code === '23505') {
    res.status(409).json({ error: 'Something with the same name or address already exists.', details: { [String(err.constraint ?? '_')]: 'Already in use.' } });
    return;
  }
  if (err?.type === 'entity.too.large') {
    res.status(413).json({ error: 'The request is too large.' });
    return;
  }
  console.error(`[api] ${req.method} ${req.originalUrl}`, err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
};
