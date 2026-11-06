'use client';

import Link from 'next/link';
import { Children, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { formatDate, formatDateRange, NEWS_CATEGORIES, RESOURCE_CATEGORIES, type HomeData } from '@bigsa/shared';
import { Img } from './Img';
import { SportCard } from './cards';
import u from './ui.module.css';
import c from './cards.module.css';
import x from './explore.module.css';

type Tab = 'sports' | 'news' | 'events' | 'forms' | 'documents';
const SWATCH = [c.swMaroon, c.swTurquoise, c.swSaffron, c.swClay];

/** The home page's browsable grid: one row of category pills, one grid of tiles. */
export function ExploreGrid({ data }: { data: Pick<HomeData, 'sports' | 'news' | 'upcoming' | 'forms' | 'resources'> }) {
  const tabs: { id: Tab; label: string; count: number; all: string }[] = [
    { id: 'sports', label: '12 Sports', count: data.sports.length, all: '/sports' },
    { id: 'news', label: 'News', count: data.news.length, all: '/news' },
    { id: 'events', label: 'Upcoming events', count: data.upcoming.length, all: '/archives' },
    { id: 'forms', label: 'Apply online', count: data.forms.length, all: '/forms' },
    { id: 'documents', label: 'Rules & documents', count: data.resources.length, all: '/forms/downloads' },
  ];
  const [tab, setTab] = useState<Tab>('sports');
  const current = tabs.find((t) => t.id === tab)!;
  const tabsRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  // Slide the pill highlight to the selected tab (re-measured on resize).
  useLayoutEffect(() => {
    const measure = () => {
      const el = tabsRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
      if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [tab]);

  return (
    <div>
      <div className={x.bar}>
        <span className={x.barLabel}>Browse</span>
        <div className={x.tabs} role="tablist" aria-label="Browse BIGSA" ref={tabsRef}>
          {indicator ? <span className={x.indicator} style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }} aria-hidden="true" /> : null}
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} aria-controls="explore-panel" className={`${u.chip} ${x.tab}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <Link href={current.all} className={u.textLink}>
          See all
        </Link>
      </div>

      <Cascade key={tab}>
        {tab === 'sports' && data.sports.map((s, i) => <SportCard key={s.slug} sport={s} index={i} />)}

        {tab === 'news' &&
          (data.news.length ? data.news.map((n, i) => (
            <Tile key={n.id} href={`/news/${n.slug}`} media={n.cover} swatch={i} fallback={NEWS_CATEGORIES[n.category]} title={n.title} meta={`${NEWS_CATEGORIES[n.category]}, ${formatDate(n.published_at)}`} />
          )) : <Empty text="News and announcements will appear here." />)}

        {tab === 'events' &&
          (data.upcoming.length ? data.upcoming.map((e, i) => (
            <Tile key={e.id} href={`/archives/${e.slug}`} media={e.cover} swatch={i} fallback={formatDate(e.starts_at, { day: 'numeric', month: 'short' })} title={e.title} meta={[formatDateRange(e.starts_at, e.ends_at), e.venue].filter(Boolean).join(', ')} />
          )) : <Empty text="No events are scheduled right now. Past events are in the archive." />)}

        {tab === 'forms' &&
          (data.forms.length ? data.forms.map((f, i) => (
            <Tile key={f.id} href={`/forms/${f.slug}`} swatch={i + 1} fallback={f.category} title={f.title} meta={f.status === 'open' ? 'Open now' : 'Opens soon'} />
          )) : <Empty text="No applications are open at the moment." />)}

        {tab === 'documents' &&
          (data.resources.length ? data.resources.map((r, i) => (
            <Tile key={r.id} href={`/forms/downloads?q=${encodeURIComponent(r.title.split(' ').slice(-2).join(' '))}`} swatch={i + 2} fallback="PDF" title={r.title} meta={RESOURCE_CATEGORIES[r.category]} />
          )) : <Empty text="Rules and documents will appear here." />)}
      </Cascade>
    </div>
  );
}

/** Grid whose tiles enter one after another each time the tab changes. */
function Cascade({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);
  return (
    <div id="explore-panel" role="tabpanel" className={x.grid}>
      {items.map((child, i) => (
        <div key={i} className={x.cell} style={{ ['--i' as string]: Math.min(i, 12) }}>
          {child}
        </div>
      ))}
    </div>
  );
}

function Tile({ href, media, title, meta, fallback, swatch }: { href: string; media?: HomeData['news'][number]['cover']; title: string; meta: string; fallback: string; swatch: number }) {
  return (
    <Link href={href} className={c.sport}>
      <span className={`${c.tile} ${media ? '' : SWATCH[swatch % SWATCH.length]}`} data-tilt>
        {media ? <Img media={media} sizes="(max-width: 700px) 90vw, 340px" className={c.tileImg} /> : (
          <>
            <span className={c.sportRings} aria-hidden="true" />
            <span className={`display ${x.fallback}`}>{fallback}</span>
          </>
        )}
      </span>
      <span className={x.caption}>
        <span className={x.title}>{title}</span>
        <span className={x.meta}>{meta}</span>
      </span>
    </Link>
  );
}

function Empty({ text }: { text: string }) {
  return <p className={x.empty}>{text}</p>;
}
