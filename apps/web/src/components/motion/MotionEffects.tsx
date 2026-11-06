'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * Site-wide pointer effects and the route-loading bar, with one listener each
 * (event delegation) instead of one per element.
 *
 *   [data-tilt]      3D tilt + cursor spotlight (mouse/trackpad only)
 *   [data-parallax]  sets --px/--py (-1..1) from the pointer, for layered decor
 *
 * Disabled entirely for prefers-reduced-motion and for touch-only devices.
 */
export function MotionEffects() {
  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduced) return;

    let current: HTMLElement | null = null;
    let frame = 0;

    const reset = (el: HTMLElement) => {
      el.removeAttribute('data-tilting');
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    };

    const onMove = (e: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const target = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-tilt]') ?? null;
        if (current && current !== target) reset(current);
        current = target;
        if (target) {
          const r = target.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width;
          const y = (e.clientY - r.top) / r.height;
          target.setAttribute('data-tilting', '');
          target.style.setProperty('--ry', `${(x - 0.5) * 9}deg`);
          target.style.setProperty('--rx', `${(0.5 - y) * 9}deg`);
          target.style.setProperty('--mx', `${x * 100}%`);
          target.style.setProperty('--my', `${y * 100}%`);
        }
        const px = (e.clientX / window.innerWidth) * 2 - 1;
        const py = (e.clientY / window.innerHeight) * 2 - 1;
        document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
          el.style.setProperty('--px', px.toFixed(3));
          el.style.setProperty('--py', py.toFixed(3));
        });
      });
    };
    const onLeave = () => current && reset(current);

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <RouteProgress />;
}

/** Thin top bar while the next page loads (starts on internal link click, finishes on route change). */
function RouteProgress() {
  const pathname = usePathname();
  const bar = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/media/')) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return; // same page / hash link
      bar.current?.setAttribute('data-state', 'loading');
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = bar.current;
    if (!el) return;
    el.setAttribute('data-state', 'done');
    const t = setTimeout(() => el.removeAttribute('data-state'), 700);
    return () => clearTimeout(t);
  }, [pathname]);

  return <div ref={bar} className="route-progress" aria-hidden="true" />;
}
