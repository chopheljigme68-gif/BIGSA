/**
 * A short burst of prayer flags (lungta) in their five colours — blue, white,
 * red, green, yellow — for moments worth celebrating, like a submitted
 * application. Canvas-based, ~1.8 s, removes itself, and does nothing when the
 * visitor prefers reduced motion.
 */
const COLOURS = ['#1f5fa8', '#ffffff', '#c8102e', '#1e8a4c', '#f2b230'];

export function lungtaBurst(origin?: { x: number; y: number }) {
  if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '200' });
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  const ox = origin?.x ?? window.innerWidth / 2;
  const oy = origin?.y ?? window.innerHeight * 0.4;
  const flags = Array.from({ length: 90 }, (_, i) => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
    const speed = 7 + Math.random() * 9;
    return {
      x: ox,
      y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      w: 9 + Math.random() * 7,
      h: 6 + Math.random() * 4,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.35,
      flutter: Math.random() * Math.PI * 2,
      colour: COLOURS[i % COLOURS.length],
    };
  });

  const start = performance.now();
  const frame = (now: number) => {
    const t = (now - start) / 1800;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const f of flags) {
      f.vy += 0.32; // gravity
      f.vx *= 0.985; // air
      f.vy *= 0.985;
      f.x += f.vx + Math.sin(f.flutter + now / 140) * 0.8;
      f.y += f.vy;
      f.rot += f.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t - 0.6) / 0.4);
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      ctx.scale(1, Math.cos(f.flutter + now / 90)); // flag flutter
      ctx.fillStyle = f.colour;
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(-f.w / 2, -f.h / 2, f.w, f.h);
      ctx.strokeRect(-f.w / 2, -f.h / 2, f.w, f.h);
      ctx.restore();
    }
    if (t < 1) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
