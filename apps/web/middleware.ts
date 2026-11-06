import { NextResponse, type NextRequest } from 'next/server';

/**
 * Runs on /admin pages and on /api requests forwarded to the API. The public
 * website pages never pass through here, so visitors are never redirected or
 * asked to sign in.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === '/api' || pathname.startsWith('/api/')) return forwardClientIp(req);

  // /admin: visitors without a session cookie go to the sign-in page. This is a UX
  // guard; every admin API call is authenticated by the API itself.
  // The sign-in page is always reachable: a cookie can exist but be invalid (expired,
  // old secret), and bouncing it back to /admin would loop. The page itself checks
  // the session with the API and moves on to the dashboard if it is valid.
  if (pathname === '/admin/login' || pathname === '/admin/refresh') return NextResponse.next();
  if (!req.cookies.has('bigsa_admin')) {
    const url = new URL('/admin/login', req.url);
    if (pathname !== '/admin') url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

/**
 * /api requests are proxied to the API (see next.config.mjs). Without help the API
 * would see this website's server as the client, so every visitor would share one
 * rate limit. Pass the visitor's address along, signed with the secret both apps
 * share; the API ignores it unless the signature matches. Only headers are touched;
 * the request body streams through unchanged.
 */
function forwardClientIp(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET?.trim() || (process.env.NODE_ENV !== 'production' ? 'bigsa-dev-revalidate-secret' : '');
  // Vercel overwrites x-forwarded-for with the real client address, so it can't be spoofed here.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip')?.trim();
  const headers = new Headers(req.headers);
  headers.delete('x-bigsa-proxy');
  headers.delete('x-bigsa-client-ip');
  if (secret && ip) {
    headers.set('x-bigsa-proxy', secret);
    headers.set('x-bigsa-client-ip', ip);
  }
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ['/admin', '/admin/:path*', '/api/:path*'] };
