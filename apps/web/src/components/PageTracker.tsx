'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Counts page views per path per day — no cookies, no IP addresses, no
 * third parties. Feeds the "most visited pages" panel in the admin dashboard.
 * For full analytics, add BIGSA's own Plausible/Google Analytics property.
 */
export function PageTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || navigator.webdriver) return;
    const body = JSON.stringify({ path: pathname.slice(0, 200) });
    if (navigator.sendBeacon) navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
    else fetch('/api/track', { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => {});
  }, [pathname]);
  return null;
}
