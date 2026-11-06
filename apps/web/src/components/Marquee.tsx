import Link from 'next/link';
import s from './marquee.module.css';

/**
 * Slow, endless band of the twelve games — the "scores ticker" of a sports site,
 * here carrying the names themselves. Pauses on hover/focus; static for
 * reduced motion. The duplicate copy is hidden from assistive tech.
 */
export function Marquee({ items }: { items: { name: string; dz: string | null; href: string }[] }) {
  if (!items.length) return null;
  const row = (hidden: boolean) => (
    <ul className={s.row} aria-hidden={hidden || undefined}>
      {items.map((it) => (
        <li key={it.href}>
          <Link href={it.href} tabIndex={hidden ? -1 : undefined} className={s.item}>
            <span className={`display ${s.name}`}>{it.name}</span>
            {it.dz ? <span className={`dz ${s.dz}`} lang="dz">{it.dz}</span> : null}
          </Link>
          <span className={s.dot} aria-hidden="true" />
        </li>
      ))}
    </ul>
  );
  return (
    <nav className={s.band} aria-label="The twelve games">
      <div className={s.track} style={{ ['--n' as string]: items.length }}>
        {row(false)}
        {row(true)}
      </div>
    </nav>
  );
}
