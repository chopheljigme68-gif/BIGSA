import Link from 'next/link';
import type { Sport } from '@bigsa/shared';
import s from './ui.module.css';

/**
 * The three tournament sports drawn to their real distances on one scale:
 * 140 m for Dha, 35 m for Khuru, 30 m for Doegor.
 */
export function RangeStrip({ sports }: { sports: Pick<Sport, 'slug' | 'name' | 'facts'>[] }) {
  const lanes = sports
    .map((sp) => {
      const range = sp.facts?.find((f) => /range/i.test(f.label));
      const metres = range ? parseFloat(range.value) : NaN;
      return Number.isFinite(metres) ? { slug: sp.slug, name: sp.name, metres, note: range!.note } : null;
    })
    .filter(Boolean) as { slug: string; name: string; metres: number; note?: string }[];
  if (!lanes.length) return null;
  const max = Math.max(...lanes.map((l) => l.metres));

  return (
    <div className={s.range}>
      {lanes.map((l) => (
        <Link key={l.slug} href={`/sports/${l.slug}`} className={s.lane} style={{ ['--pct' as string]: `${(l.metres / max) * 100}%` }}>
          <span className={`display ${s.laneName}`}>{l.name}</span>
          <span className={s.laneTrack} aria-hidden="true">
            <span className={s.laneBar}>
              <span className={s.laneTarget} />
            </span>
          </span>
          <span className={s.laneDist}>
            <span className="display">{l.metres} m</span>
            {l.note ? <span className={s.laneNote}>{l.note}</span> : null}
          </span>
        </Link>
      ))}
    </div>
  );
}
