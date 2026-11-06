'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { MediaRef } from '@bigsa/shared';
import { Img } from './Img';
import s from './ui.module.css';

type ViewTransitionDoc = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

/**
 * Run a DOM update as a View Transition in which `from` morphs into `to`
 * (the photo grows out of its thumbnail, and shrinks back on close).
 * Falls back to an instant update without the API or with reduced motion.
 */
function morph(from: HTMLElement | null, getTo: () => HTMLElement | null, update: () => void) {
  const doc = document as ViewTransitionDoc;
  if (!doc.startViewTransition || !from || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    update();
    return;
  }
  from.style.viewTransitionName = 'lightbox-photo';
  const t = doc.startViewTransition(() => {
    from.style.viewTransitionName = '';
    flushSync(update);
    const to = getTo();
    if (to) to.style.viewTransitionName = 'lightbox-photo';
  });
  t.finished.finally(() => {
    from.style.viewTransitionName = '';
    const to = getTo();
    if (to) to.style.viewTransitionName = '';
  });
}

/** Photo grid with a keyboard- and swipe-friendly lightbox. */
export function Gallery({ items, layout = 'grid' }: { items: MediaRef[]; layout?: 'grid' | 'strip' }) {
  const [open, setOpen] = useState<number | null>(null);
  const openRef = useRef<number | null>(null);
  openRef.current = open;
  const touchX = useRef(0);
  const thumbs = useRef<(HTMLButtonElement | null)[]>([]);

  const thumbImg = (i: number) => thumbs.current[i]?.querySelector('img') ?? null;
  const bigImg = () => document.querySelector<HTMLElement>('[data-lightbox-photo]');

  const openAt = (i: number) => morph(thumbImg(i), bigImg, () => setOpen(i));

  const close = useCallback(() => {
    const i = openRef.current;
    if (i === null) return;
    morph(bigImg(), () => thumbImg(i), () => setOpen(null));
    // Return focus to the photo that was opened.
    requestAnimationFrame(() => thumbs.current[i]?.focus());
  }, []);

  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + items.length) % items.length)), [items.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, close, step]);

  if (!items.length) return null;
  const current = open !== null ? items[open] : null;

  return (
    <>
      <ul className={layout === 'strip' ? s.galleryStrip : s.galleryGrid}>
        {items.map((m, i) => (
          <li key={m.id} style={m.width && m.height ? { ['--ar' as string]: `${m.width} / ${m.height}` } : undefined}>
            <button
              type="button"
              ref={(el) => {
                thumbs.current[i] = el;
              }}
              onClick={() => openAt(i)}
              aria-label={`Open photo: ${m.alt ?? `photo ${i + 1}`}`}
            >
              <Img media={m} sizes={layout === 'strip' ? '360px' : '(max-width: 700px) 50vw, 25vw'} />
            </button>
          </li>
        ))}
      </ul>
      {current ? (
        <div
          className={s.lightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          onClick={(e) => e.target === e.currentTarget && close()}
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
          }}
        >
          <figure className={s.lightboxFigure}>
            <img data-lightbox-photo key={current.id} className={s.lightboxImg} src={`/media/${current.id}?w=1600`} alt={current.alt ?? ''} />
            <figcaption>
              <span>{current.caption ?? current.alt}</span>
              <span className={s.lightboxCount}>
                {open! + 1} of {items.length}
                {current.credit ? `, photo ${current.credit}` : ''}
              </span>
            </figcaption>
          </figure>
          <button type="button" className={s.lbClose} onClick={close} autoFocus>
            Close
          </button>
          {items.length > 1 ? (
            <>
              <button type="button" className={`${s.lbNav} ${s.lbPrev}`} onClick={() => step(-1)} aria-label="Previous photo">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
              </button>
              <button type="button" className={`${s.lbNav} ${s.lbNext}`} onClick={() => step(1)} aria-label="Next photo">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
