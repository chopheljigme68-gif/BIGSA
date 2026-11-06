import { Fragment } from 'react';
import Link from 'next/link';
import type { HomeData } from '@bigsa/shared';
import { Gallery } from '@/components/Gallery';
import { RangeStrip } from '@/components/RangeStrip';
import { TargetExplainer } from '@/components/TargetExplainer';
import { ExploreGrid } from '@/components/ExploreGrid';
import { SearchPill } from '@/components/SearchPill';
import { Marquee } from '@/components/Marquee';
import { NewsCard, EventRow } from '@/components/cards';
import u from '@/components/ui.module.css';
import h from './home.module.css';

const POPULAR = [
  { q: 'archery rules', label: 'Archery rules' },
  { q: 'team entry', label: 'Team entry' },
  { q: 'khuru', label: 'Khuru' },
  { q: 'doegor', label: 'Doegor' },
  { q: 'safety', label: 'Range safety' },
  { q: 'dachham', label: 'Dachham' },
];

const HEADLINE = 'Discover Bhutan’s indigenous games and sports';

export function HomeView({ data }: { data: HomeData }) {
  const { settings, sports, news, upcoming, gallery } = data;
  const scored = sports.filter((s) => s.scoring?.length);
  const [lead, ...restNews] = news;

  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <section className={h.hero} aria-labelledby="hero-title" data-parallax>
        {/* Decorative Gorthig rings: drift slowly and follow the pointer at different depths */}
        <span className={`${h.ring} ${h.ringA}`} aria-hidden="true" />
        <span className={`${h.ring} ${h.ringB}`} aria-hidden="true" />
        <span className={`${h.ring} ${h.ringC}`} aria-hidden="true" />
        <div className={`container ${h.heroInner}`}>
          <h1 id="hero-title" className={`display ${h.heroTitle}`} aria-label={HEADLINE}>
            {HEADLINE.split(' ').map((word, i) => (
              // The space sits between the clipped word boxes so it is never collapsed.
              <Fragment key={i}>
                {i > 0 ? ' ' : null}
                <span className={h.word} aria-hidden="true">
                  <span style={{ animationDelay: `${0.08 + i * 0.07}s` }}>{word}</span>
                </span>
              </Fragment>
            ))}
          </h1>
          <p className={h.heroLede}>
            Rules, history and scoring for all twelve games, tournament entry online, and news from the Bhutan Indigenous Games and Sports Association.
          </p>
          <SearchPill />
          <div className={h.popular}>
            <span className={h.popularLabel}>Popular searches</span>
            <ul>
              {POPULAR.map((p) => (
                <li key={p.q}>
                  <Link href={`/search?q=${encodeURIComponent(p.q)}`} className={u.chipSoft}>
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ browse grid */}
      <section className={h.explore} aria-label="Browse">
        <div className="container">
          <ExploreGrid data={data} />
        </div>
      </section>

      <Marquee items={sports.map((s) => ({ name: s.name, dz: s.name_dz, href: `/sports/${s.slug}` }))} />

      {/* ------------------------------------------------------------ scoring explainer */}
      {scored.length ? (
        <section className={u.section} aria-label="How scoring works">
          <div className={`container`}>
            <div className={h.panel}>
              <TargetExplainer sports={scored.map((s) => ({ slug: s.slug, name: s.name, scoring: s.scoring }))} />
            </div>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------ the ranges */}
      <section className={`${u.section} ${h.noTop}`} aria-labelledby="range-title">
        <div className={`container ${h.rangeWrap}`}>
          <div>
            <h2 id="range-title" className={`display ${h.title}`}>
              From 140 metres to 30
            </h2>
            <p className={h.sub}>The three tournament sports on one scale. A Dha target stands four times farther away than a Khuru target.</p>
          </div>
          <RangeStrip sports={sports} />
        </div>
      </section>

      {/* ------------------------------------------------------------ news + events */}
      <section className={`${u.section} ${h.noTop}`} aria-label="News and events">
        <div className={`container ${h.split}`}>
          <div>
            <div className={h.head}>
              <h2 className={`display ${h.title}`}>Latest news</h2>
              <Link href="/news" className={u.textLink}>
                All news
              </Link>
            </div>
            {lead ? (
              <>
                <NewsCard item={lead} variant="lead" />
                <div className={h.newsList}>
                  {restNews.map((n) => (
                    <NewsCard key={n.id} item={n} variant="row" />
                  ))}
                </div>
              </>
            ) : (
              <p className={h.quiet}>Announcements, tournament notices and results will appear here.</p>
            )}
          </div>
          <div>
            <div className={h.head}>
              <h2 className={`display ${h.title}`}>Coming up</h2>
              <Link href="/archives" className={u.textLink}>
                Archives
              </Link>
            </div>
            {upcoming.length ? upcoming.map((e) => <EventRow key={e.id} event={e} />) : <p className={h.quiet}>No events are scheduled right now.</p>}
            <div className={h.applyCard}>
              <h3 className="display">Entering a tournament?</h3>
              <p>Register your team online. You’ll get a reference number straight away.</p>
              <Link href="/forms" className={`${u.btn} ${u.primary}`}>
                Apply online
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ gallery */}
      {gallery.length ? (
        <section className={h.galleryBand} aria-labelledby="photos-title">
          <div className={`container ${h.head}`}>
            <h2 id="photos-title" className={`display ${h.title}`}>
              On the range
            </h2>
            <p className={h.sub}>{settings.motto?.en}</p>
          </div>
          <Gallery items={gallery} layout="strip" />
        </section>
      ) : null}
    </>
  );
}
