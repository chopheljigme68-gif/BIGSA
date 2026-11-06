'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import s from './ui.module.css';

/**
 * Horizontal rail with scroll-snap, mouse drag, and previous/next buttons.
 * Keyboard and touch users get native scrolling.
 */
export function Rail({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const page = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' });

  return (
    <div className={s.railWrap}>
      <div
        ref={ref}
        className={s.rail}
        role="region"
        aria-label={label}
        tabIndex={0}
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse' || !ref.current) return;
          drag.current = { x: e.clientX, left: ref.current.scrollLeft, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || !ref.current) return;
          const dx = e.clientX - d.x;
          if (Math.abs(dx) > 4) {
            d.moved = true;
            ref.current.classList.add(s.dragging);
            ref.current.scrollLeft = d.left - dx;
          }
        }}
        onPointerUp={() => {
          ref.current?.classList.remove(s.dragging);
          setTimeout(() => (drag.current = null), 0);
        }}
        onPointerLeave={() => {
          ref.current?.classList.remove(s.dragging);
          drag.current = null;
        }}
        onClickCapture={(e) => {
          // A drag should not count as a click on the card underneath.
          if (drag.current?.moved) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {children}
      </div>
      <div className={s.railNav}>
        <button type="button" onClick={() => page(-1)} disabled={edges.start} aria-label="Scroll back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <button type="button" onClick={() => page(1)} disabled={edges.end} aria-label="Scroll forward">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
}
