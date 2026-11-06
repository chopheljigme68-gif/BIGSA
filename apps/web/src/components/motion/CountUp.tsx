'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Counts a figure up when it scrolls into view, e.g. "140 m" -> 0…140 m.
 * Non-numeric values ("4–6") render unchanged. The final text is in the HTML
 * from the start, so search engines and screen readers always get the real value.
 */
export function CountUp({ value, className }: { value: string; className?: string }) {
  const match = value.match(/^(\d+(?:\.\d+)?)(.*)$/);
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || !match || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const target = Number(match[1]);
    const suffix = match[2];
    const decimals = (match[1].split('.')[1] ?? '').length;
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const duration = Math.min(1600, 500 + target * 6);
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 4);
          setShown(`${(target * eased).toFixed(decimals)}${suffix}`);
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        setShown(`${(0).toFixed(decimals)}${suffix}`);
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span ref={ref} className={className} aria-label={value}>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}
