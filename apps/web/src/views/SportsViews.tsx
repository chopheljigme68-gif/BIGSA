import Link from 'next/link';
import type { Sport, NewsItem, EventItem, Resource } from '@bigsa/shared';
import { PageHead } from '@/components/PageHead';
import { Img } from '@/components/Img';
import { Paragraphs } from '@/components/Markdown';
import { Gallery } from '@/components/Gallery';
import { RangeStrip } from '@/components/RangeStrip';
import { TargetExplainer } from '@/components/TargetExplainer';
import { RuleFinder } from '@/components/RuleFinder';
import { CountUp } from '@/components/motion/CountUp';
import { Toc } from '@/components/Toc';
import { SportCard, NewsCard, EventRow, ResourceRow } from '@/components/cards';
import u from '@/components/ui.module.css';
import p from './pages.module.css';

export function SportsIndexView({ data }: { data: { sports: Sport[] } }) {
  const documented = data.sports.filter((s) => s.has_content);
  const others = data.sports.filter((s) => !s.has_content);
  return (
    <>
      <PageHead
        title="12 Sports"
        lede="The indigenous games and sports of Bhutan. BIGSA runs national tournaments in Dha, Khuru and Doegor, and is documenting every game so it can be learned, played and passed on."
        crumbs={[{ href: '/sports', label: '12 Sports' }]}
      />
      <section className={u.section}>
        <div className="container">
          <ul className={p.sportGridLarge}>
            {documented.map((s, i) => (
              <li key={s.slug}>
                <SportCard sport={s} index={i} size="grid" />
              </li>
            ))}
          </ul>
          {others.length ? (
            <>
              <h2 className={`${p.colTitle} ${p.gridLabel}`}>Archive entries in preparation</h2>
              <ul className={p.sportGrid}>
                {others.map((s, i) => (
                  <li key={s.slug}>
                    <SportCard sport={s} index={i} size="grid" />
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </section>
      <section className={u.section} aria-labelledby="range-title">
        <div className="container">
          <h2 id="range-title" className={`display ${u.sectionTitle}`}>
            The ranges
          </h2>
          <p className={u.sectionSub}>Distances between targets, drawn to one scale.</p>
          <div className={p.spaced}>
            <RangeStrip sports={data.sports} />
          </div>
        </div>
      </section>
    </>
  );
}

type SportDetail = Sport & { news: NewsItem[]; events: EventItem[]; resources: Resource[] };

export function SportView({ data: sport }: { data: SportDetail }) {
  const sections = [
    sport.history && { id: 'history', label: 'History' },
    sport.how_to_play && { id: 'play', label: 'How it’s played' },
    sport.scoring.length && { id: 'scoring', label: 'Scoring' },
    sport.equipment.length && { id: 'equipment', label: 'Equipment' },
    sport.rules.length && { id: 'rules', label: 'Rules' },
    sport.gallery.length && { id: 'photos', label: 'Photos' },
    sport.resources.length && { id: 'documents', label: 'Documents' },
  ].filter(Boolean) as { id: string; label: string }[];

  return (
    <>
      <header className={p.sportHero}>
        {sport.cover ? <Img media={sport.cover} priority sizes="100vw" className={p.sportHeroImg} /> : null}
        <div className={`container ${p.sportHeroInner}`}>
          <nav aria-label="Breadcrumb">
            <ol className={u.crumbs}>
              <li><Link href="/">Home</Link></li>
              <li><Link href="/sports">12 Sports</Link></li>
            </ol>
          </nav>
          {sport.name_dz ? <p className={`dz ${p.sportDz}`} lang="dz">{sport.name_dz}</p> : null}
          <h1 className={`display ${p.sportTitle}`}>{sport.name}</h1>
          {sport.tagline ? <p className={p.sportTagline}>{sport.tagline}</p> : null}
        </div>
      </header>

      {sport.facts.length ? (
        <div className={p.factsBar}>
          <dl className={`container ${p.facts}`}>
            {sport.facts.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>
                  <CountUp className="display" value={f.value} />
                  {f.note ? <span className={p.factNote}>{f.note}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {!sport.has_content ? (
        <section className={u.section}>
          <div className="container">
            <div className={u.empty}>
              <h3>This archive entry is being prepared</h3>
              <p>
                BIGSA is documenting how {sport.name} is played, where it comes from and what it means. If you have photographs, recordings or knowledge of {sport.name} to share, we would like to hear from you.
              </p>
              <Link href="/contact" className={u.textLink}>
                Share what you know
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <div className={`container ${p.sportLayout}`}>
          {sections.length > 2 ? (
            <Toc className={p.toc} sections={sections} />
          ) : null}

          <div className={p.sportMain}>
            {sport.summary ? <p className={p.sportSummary}>{sport.summary}</p> : null}

            {sport.history ? (
              <section id="history" className={p.block} data-reveal>
                <h2 className={`display ${p.blockTitle}`}>History</h2>
                <Paragraphs text={sport.history} className={u.prose} />
              </section>
            ) : null}

            {sport.how_to_play ? (
              <section id="play" className={p.block} data-reveal>
                <h2 className={`display ${p.blockTitle}`}>How it’s played</h2>
                <Paragraphs text={sport.how_to_play} className={u.prose} />
              </section>
            ) : null}

            {sport.cultural_significance ? (
              <aside className={p.culture} data-reveal="scale">
                <h2 className={p.cultureTitle}>On the range</h2>
                <Paragraphs text={sport.cultural_significance} />
              </aside>
            ) : null}

            {sport.scoring.length ? (
              <section id="scoring" className={p.block}>
                <h2 className={`display ${p.blockTitle}`}>Scoring</h2>
                <TargetExplainer heading={false} sports={[{ slug: sport.slug, name: sport.name, scoring: sport.scoring }]} />
              </section>
            ) : null}

            {sport.equipment.length ? (
              <section id="equipment" className={p.block}>
                <h2 className={`display ${p.blockTitle}`}>Equipment</h2>
                <ul className={p.equipment}>
                  {sport.equipment.map((e) => (
                    <li key={e.name} data-reveal>
                      {e.image ? (
                        <div className={p.equipImg}>
                          <Img media={e.image} sizes="(max-width: 700px) 100vw, 320px" />
                        </div>
                      ) : null}
                      <h3>
                        {e.name} {e.name_dz ? <span className={`dz ${p.equipDz}`} lang="dz">{e.name_dz}</span> : null}
                      </h3>
                      <p>{e.description}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {sport.rules.length ? (
              <section id="rules" className={p.block}>
                <h2 className={`display ${p.blockTitle}`}>Rules</h2>
                <RuleFinder sections={sport.rules} sportName={sport.name} />
              </section>
            ) : null}
          </div>
        </div>
      )}

      {sport.video_url ? <VideoEmbed url={sport.video_url} title={`${sport.name} video`} /> : null}

      {sport.gallery.length ? (
        <section id="photos" className={`${u.section} ${u.bone}`}>
          <div className="container">
            <h2 className={`display ${p.blockTitle}`}>Photos</h2>
            <div className={p.spaced}>
              <Gallery items={sport.gallery} />
            </div>
          </div>
        </section>
      ) : null}

      {sport.resources.length ? (
        <section id="documents" className={u.section}>
          <div className="container">
            <h2 className={`display ${p.blockTitle}`}>Documents</h2>
            {sport.resources.map((r) => (
              <ResourceRow key={r.id} resource={r} />
            ))}
          </div>
        </section>
      ) : null}

      {sport.events.length || sport.news.length ? (
        <section className={`${u.section} ${u.bone}`}>
          <div className={`container ${p.twoUp}`}>
            {sport.events.length ? (
              <div>
                <h2 className={`display ${p.blockTitle}`}>Events</h2>
                {sport.events.map((e) => (
                  <EventRow key={e.id} event={e} />
                ))}
              </div>
            ) : null}
            {sport.news.length ? (
              <div>
                <h2 className={`display ${p.blockTitle}`}>News</h2>
                {sport.news.map((n) => (
                  <NewsCard key={n.id} item={n} variant="row" />
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </>
  );
}

/** Privacy-friendly embeds for YouTube and Vimeo links; anything else becomes a link. */
export function VideoEmbed({ url, title }: { url: string; title: string }) {
  let src: string | null = null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})/);
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (yt) src = `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  else if (vimeo) src = `https://player.vimeo.com/video/${vimeo[1]}`;
  return (
    <section className={u.sectionTight}>
      <div className="container">
        {src ? (
          <div className={p.video}>
            <iframe src={src} title={title} loading="lazy" allow="encrypted-media; picture-in-picture" allowFullScreen />
          </div>
        ) : (
          <a href={url} className={u.textLink} target="_blank" rel="noopener noreferrer">
            Watch the video
          </a>
        )}
      </div>
    </section>
  );
}
