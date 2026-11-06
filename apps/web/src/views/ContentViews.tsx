import Link from 'next/link';
import {
  NEWS_CATEGORIES, RESOURCE_CATEGORIES, formatDate, formatDateRange,
  type NewsItem, type EventItem, type Paged, type Resource, type PublicForm, type SiteSettings, type SearchHit, type NewsCategory,
} from '@bigsa/shared';
import { PageHead } from '@/components/PageHead';
import { Img } from '@/components/Img';
import { Markdown } from '@/components/Markdown';
import { Gallery } from '@/components/Gallery';
import { ShareLinks } from '@/components/ShareLinks';
import { ContactForm } from '@/components/ContactForm';
import { FormWizard } from '@/components/FormWizard';
import { SearchPill } from '@/components/SearchPill';
import { NewsCard, EventRow, ResourceRow, FormCard, FormStatusPill } from '@/components/cards';
import { sanitizeSnippet } from '@/lib/snippet';
import u from '@/components/ui.module.css';
import p from './pages.module.css';

const href = (base: string, params: Record<string, string | number | undefined>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '' && v !== 1) s.set(k, String(v));
  const q = s.toString();
  return q ? `${base}?${q}` : base;
};

/* ======================================================================= news */
export function NewsIndexView({ data }: { data: { news: Paged<NewsItem>; category?: string } }) {
  const { news, category } = data;
  const pages = Math.max(1, Math.ceil(news.total / news.pageSize));
  const [lead, ...rest] = news.items;
  const showLead = news.page === 1 && !category && lead;
  return (
    <>
      <PageHead title="News" lede="Announcements, tournament notices, training and courses, application deadlines and results." crumbs={[{ href: '/news', label: 'News' }]} />
      <section className={u.sectionTight}>
        <div className="container">
          <nav aria-label="Filter by category">
            <ul className={u.chips}>
              <li>
                <Link href="/news" className={u.chip} aria-current={!category ? 'true' : undefined}>
                  Everything
                </Link>
              </li>
              {(Object.keys(NEWS_CATEGORIES) as NewsCategory[]).map((c) => (
                <li key={c}>
                  <Link href={href('/news', { category: c })} className={u.chip} aria-current={category === c ? 'true' : undefined}>
                    {NEWS_CATEGORIES[c]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>
      <section className={`${u.section} ${p.noTop}`}>
        <div className="container">
          {news.items.length === 0 ? (
            <div className={u.empty}>
              <h3>Nothing here yet</h3>
              <p>{category ? `There are no ${NEWS_CATEGORIES[category as NewsCategory]?.toLowerCase()} posts yet.` : 'BIGSA has not published any news yet.'}</p>
              {category ? <Link href="/news" className={u.textLink}>See all news</Link> : null}
            </div>
          ) : (
            <>
              {showLead ? (
                <div className={p.newsLead}>
                  <NewsCard item={lead} variant="lead" />
                </div>
              ) : null}
              <ul className={p.newsGrid}>
                {(showLead ? rest : news.items).map((n) => (
                  <li key={n.id}>
                    <NewsCard item={n} />
                  </li>
                ))}
              </ul>
              {pages > 1 ? <Pager page={news.page} pages={pages} make={(pg) => href('/news', { category, page: pg })} /> : null}
            </>
          )}
        </div>
      </section>
    </>
  );
}

function Pager({ page, pages, make }: { page: number; pages: number; make: (p: number) => string }) {
  return (
    <nav className={p.pager} aria-label="Pages">
      {page > 1 ? <Link href={make(page - 1)} className={`${u.btn} ${u.ghost}`}>Newer</Link> : <span />}
      <span>
        Page {page} of {pages}
      </span>
      {page < pages ? <Link href={make(page + 1)} className={`${u.btn} ${u.ghost}`}>Older</Link> : <span />}
    </nav>
  );
}

export function ArticleView({ data: a }: { data: NewsItem & { related: NewsItem[] } }) {
  return (
    <article>
      <div className="reading-progress" aria-hidden="true" />
      <header className={p.articleHead}>
        <div className={`container ${p.narrow}`}>
          <nav aria-label="Breadcrumb">
            <ol className={`${u.crumbs} ${p.crumbsLight}`}>
              <li><Link href="/">Home</Link></li>
              <li><Link href="/news">News</Link></li>
            </ol>
          </nav>
          <p className={p.articleMeta}>
            <Link href={`/news?category=${a.category}`} className={p.articleCat}>{NEWS_CATEGORIES[a.category]}</Link>
            <time dateTime={a.published_at ?? undefined}>{formatDate(a.published_at, { day: 'numeric', month: 'long', year: 'numeric' })}</time>
            {a.sport ? <Link href={`/sports/${a.sport.slug}`}>{a.sport.name}</Link> : null}
          </p>
          <h1 className={p.articleTitle}>{a.title}</h1>
          {a.excerpt ? <p className={p.articleDek}>{a.excerpt}</p> : null}
        </div>
      </header>
      {a.cover ? (
        <figure className={`container ${p.articleCover}`}>
          <Img media={a.cover} priority sizes="(max-width: 1360px) 100vw, 1260px" />
          {a.cover.caption || a.cover.credit ? <figcaption>{[a.cover.caption, a.cover.credit && `Photo: ${a.cover.credit}`].filter(Boolean).join('. ')}</figcaption> : null}
        </figure>
      ) : null}
      <div className={`container ${p.narrow} ${p.articleBody}`}>
        <Markdown source={a.body} className={u.prose} />
        <ShareLinks title={a.title} />
      </div>
      {a.related.length ? (
        <section className={`${u.section} ${u.bone}`} aria-labelledby="more-title">
          <div className="container">
            <h2 id="more-title" className={`display ${p.blockTitle}`}>More news</h2>
            <ul className={p.newsGrid}>
              {a.related.map((n) => (
                <li key={n.id}>
                  <NewsCard item={n} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </article>
  );
}

/* ======================================================================= archives */
export function ArchivesView({ data }: { data: { events: Paged<EventItem> & { years: number[] }; when: string; sport?: string; year?: number; sports: { slug: string; name: string }[] } }) {
  const { events, when, sport, year, sports } = data;
  const byYear = new Map<string, EventItem[]>();
  for (const e of events.items) {
    const y = formatDate(e.starts_at, { year: 'numeric' });
    byYear.set(y, [...(byYear.get(y) ?? []), e]);
  }
  const base = { when: when === 'all' ? undefined : when, sport, year };
  return (
    <>
      <PageHead title="Archives" lede="Tournaments, championships and events, upcoming and past, with results and photographs." crumbs={[{ href: '/archives', label: 'Archives' }]} />
      <section className={u.sectionTight}>
        <div className={`container ${p.filters}`}>
          <nav aria-label="When">
            <ul className={u.chips}>
              {[['all', 'All events'], ['upcoming', 'Upcoming'], ['past', 'Past']].map(([k, label]) => (
                <li key={k}>
                  <Link href={href('/archives', { ...base, when: k === 'all' ? undefined : k })} className={u.chip} aria-current={when === k ? 'true' : undefined}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <form className={p.filterForm} action="/archives">
            {when !== 'all' ? <input type="hidden" name="when" value={when} /> : null}
            <label>
              <span className="visually-hidden">Sport</span>
              <select name="sport" defaultValue={sport ?? ''} className={u.select}>
                <option value="">Every sport</option>
                {sports.map((s) => (
                  <option key={s.slug} value={s.slug}>{s.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="visually-hidden">Year</span>
              <select name="year" defaultValue={year ?? ''} className={u.select}>
                <option value="">Every year</option>
                {events.years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
            <button type="submit" className={`${u.btn} ${u.primary}`}>Filter</button>
          </form>
        </div>
      </section>
      <section className={`${u.section} ${p.noTop}`}>
        <div className="container">
          {events.items.length === 0 ? (
            <div className={u.empty}>
              <h3>No events match</h3>
              <p>Try another sport or year, or see every event.</p>
              <Link href="/archives" className={u.textLink}>Show all events</Link>
            </div>
          ) : (
            [...byYear.entries()].map(([y, list]) => (
              <div key={y} className={p.yearGroup} data-reveal>
                <h2 className={`display ${p.year}`}>{y}</h2>
                <div>
                  {list.map((e) => (
                    <EventRow key={e.id} event={e} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}

export function EventView({ data: e }: { data: EventItem }) {
  const past = new Date(e.ends_at ?? e.starts_at) < new Date();
  return (
    <article>
      <header className={p.sportHero}>
        {e.cover ? <Img media={e.cover} priority sizes="100vw" className={p.sportHeroImg} /> : null}
        <div className={`container ${p.sportHeroInner}`}>
          <nav aria-label="Breadcrumb">
            <ol className={u.crumbs}>
              <li><Link href="/">Home</Link></li>
              <li><Link href="/archives">Archives</Link></li>
            </ol>
          </nav>
          <p className={p.eventWhen}>
            <span className={`${u.pill} ${past ? u.closed : u.upcoming}`}>{past ? 'Past event' : 'Upcoming'}</span>
          </p>
          <h1 className={`display ${p.eventTitle}`}>{e.title}</h1>
        </div>
      </header>
      <div className={p.factsBar}>
        <dl className={`container ${p.facts}`}>
          <div>
            <dt>When</dt>
            <dd><time dateTime={e.starts_at}>{formatDateRange(e.starts_at, e.ends_at)}</time></dd>
          </div>
          {e.venue ? (
            <div>
              <dt>Where</dt>
              <dd>{e.venue}</dd>
            </div>
          ) : null}
          {e.sport ? (
            <div>
              <dt>Sport</dt>
              <dd><Link href={`/sports/${e.sport.slug}`}>{e.sport.name}</Link></dd>
            </div>
          ) : null}
        </dl>
      </div>
      <div className={`container ${p.narrow} ${p.articleBody}`}>
        {e.summary ? <p className={p.articleDek}>{e.summary}</p> : null}
        <Markdown source={e.body} className={u.prose} />
        {e.results ? (
          <section className={p.results}>
            <h2 className={`display ${p.blockTitle}`}>Results</h2>
            <Markdown source={e.results} className={u.prose} />
          </section>
        ) : null}
        <ShareLinks title={e.title} />
      </div>
      {e.gallery.length ? (
        <section className={`${u.section} ${u.bone}`}>
          <div className="container">
            <h2 className={`display ${p.blockTitle}`}>Photos</h2>
            <div className={p.spaced}>
              <Gallery items={e.gallery} />
            </div>
          </div>
        </section>
      ) : null}
    </article>
  );
}

/* ======================================================================= forms */
function FormsTabs({ current }: { current: 'apply' | 'downloads' }) {
  return (
    <nav aria-label="Forms section" className={p.tabsWrap}>
      <ul className={`container ${p.tabs}`}>
        <li>
          <Link href="/forms" aria-current={current === 'apply' ? 'page' : undefined}>Online applications</Link>
        </li>
        <li>
          <Link href="/forms/downloads" aria-current={current === 'downloads' ? 'page' : undefined}>Rules and downloads</Link>
        </li>
      </ul>
    </nav>
  );
}

export function FormsView({ data }: { data: { forms: PublicForm[] } }) {
  const groups = new Map<string, PublicForm[]>();
  for (const f of data.forms) groups.set(f.category, [...(groups.get(f.category) ?? []), f]);
  return (
    <>
      <PageHead title="Forms" lede="Apply online, track your application by its reference number, and download the rules and forms you need." crumbs={[{ href: '/forms', label: 'Forms' }]} />
      <FormsTabs current="apply" />
      <section className={u.section}>
        <div className="container">
          {data.forms.length === 0 ? (
            <div className={u.empty}>
              <h3>No forms are open right now</h3>
              <p>Application forms appear here when BIGSA opens them. Printable forms and rules are under Rules and downloads.</p>
            </div>
          ) : (
            [...groups.entries()].map(([cat, forms]) => (
              <div key={cat} className={p.formGroup}>
                <h2 className={p.colTitle}>{cat}</h2>
                <ul className={p.formGrid}>
                  {forms.map((f) => (
                    <li key={f.id}>
                      <FormCard form={f} />
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
          <aside className={p.howItWorks}>
            <h2 className={p.colTitle}>How online applications work</h2>
            <ol>
              <li><strong>Check you’re eligible</strong> and have the documents listed on the form ready to upload.</li>
              <li><strong>Fill in each step.</strong> Required fields are marked, and mistakes are pointed out before you move on.</li>
              <li><strong>Review and submit.</strong> You’ll get a reference number on screen and an acknowledgement by email.</li>
              <li><strong>BIGSA reviews it</strong> and contacts you if anything more is needed. Quote your reference number if you call.</li>
            </ol>
          </aside>
        </div>
      </section>
    </>
  );
}

export function FormPageView({ data: form }: { data: PublicForm }) {
  return (
    <>
      <PageHead title={form.title} lede={form.summary ?? undefined} crumbs={[{ href: '/forms', label: 'Forms' }, { href: `/forms/${form.slug}`, label: form.title }]}>
        <p className={p.formHeadStatus}>
          <FormStatusPill form={form} />
        </p>
      </PageHead>
      <section className={u.section}>
        <div className={`container ${p.formLayout}`}>
          <aside className={p.formInfo}>
            {form.eligibility ? (
              <div>
                <h2>Who can apply</h2>
                <p>{form.eligibility}</p>
              </div>
            ) : null}
            {form.requirements ? (
              <div>
                <h2>What you’ll need</h2>
                <p>{form.requirements}</p>
              </div>
            ) : null}
            {form.instructions ? (
              <div>
                <h2>Before you start</h2>
                <p>{form.instructions}</p>
              </div>
            ) : null}
            {form.opens_at || form.closes_at ? (
              <div>
                <h2>Dates</h2>
                <p>
                  {form.opens_at ? `Opens ${formatDate(form.opens_at, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}. ` : ''}
                  {form.closes_at ? `Closes ${formatDate(form.closes_at, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.` : ''}
                </p>
              </div>
            ) : null}
            {form.download ? (
              <div>
                <h2>Prefer paper?</h2>
                <a href={`/media/${form.download.id}?download=1`} className={u.textLink}>Download the printable form</a>
              </div>
            ) : null}
            {form.faq.length ? (
              <div>
                <h2>Questions</h2>
                {form.faq.map((f) => (
                  <details key={f.q} className={p.faq}>
                    <summary>{f.q}</summary>
                    <p>{f.a}</p>
                  </details>
                ))}
              </div>
            ) : null}
            {form.contact_note ? <p className={p.contactNote}>{form.contact_note}</p> : null}
          </aside>
          <div>
            {form.status === 'open' ? (
              <FormWizard form={form} />
            ) : (
              <div className={u.empty}>
                <h3>{form.status === 'upcoming' ? 'This form opens soon' : 'This form is closed'}</h3>
                <p>{form.status === 'upcoming' && form.opens_at ? `You can apply from ${formatDate(form.opens_at, { day: 'numeric', month: 'long', year: 'numeric' })}.` : 'It is not accepting applications at the moment. Watch the news page for the next opening.'}</p>
                <Link href="/news?category=notice" className={u.textLink}>Application notices</Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export function DownloadsView({ data }: { data: { resources: Resource[]; q?: string; category?: string; sport?: string; sports: { slug: string; name: string }[] } }) {
  const { resources, q, category, sport, sports } = data;
  return (
    <>
      <PageHead title="Forms" lede="Apply online, track your application by its reference number, and download the rules and forms you need." crumbs={[{ href: '/forms', label: 'Forms' }, { href: '/forms/downloads', label: 'Rules and downloads' }]} />
      <FormsTabs current="downloads" />
      <section className={u.section}>
        <div className="container">
          <form className={p.docSearch} action="/forms/downloads" role="search">
            <label className={p.docSearchQ}>
              <span className="visually-hidden">Search documents</span>
              <input type="search" name="q" defaultValue={q} placeholder="Search rules, standards and forms" className={u.input} />
            </label>
            <label>
              <span className="visually-hidden">Category</span>
              <select name="category" defaultValue={category ?? ''} className={u.select}>
                <option value="">Every category</option>
                {Object.entries(RESOURCE_CATEGORIES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="visually-hidden">Sport</span>
              <select name="sport" defaultValue={sport ?? ''} className={u.select}>
                <option value="">Every sport</option>
                {sports.map((s) => (
                  <option key={s.slug} value={s.slug}>{s.name}</option>
                ))}
              </select>
            </label>
            <button type="submit" className={`${u.btn} ${u.primary}`}>Search</button>
          </form>
          <p className={p.resultCount}>
            {resources.length} document{resources.length === 1 ? '' : 's'}
            {q || category || sport ? (
              <>
                {' '}
                <Link href="/forms/downloads" className={u.textLink}>Clear filters</Link>
              </>
            ) : null}
          </p>
          {resources.length ? (
            resources.map((r) => <ResourceRow key={r.id} resource={r} />)
          ) : (
            <div className={u.empty}>
              <h3>No documents match</h3>
              <p>Try a shorter search term, or clear the filters to see every document.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

/* ======================================================================= contact */
export function ContactView({ data }: { data: { settings: SiteSettings } }) {
  const c = data.settings.contact;
  const { lat, lng } = c.map;
  const bbox = [lng - 0.006, lat - 0.004, lng + 0.006, lat + 0.004].join('%2C');
  return (
    <>
      <PageHead title="Contact us" lede="Questions about a tournament, the rules or an application? Get in touch with the BIGSA office." crumbs={[{ href: '/contact', label: 'Contact us' }]} />
      <section className={u.section}>
        <div className={`container ${p.contactGrid}`}>
          <div className={p.contactInfo}>
            <dl>
              <div>
                <dt>Call</dt>
                <dd><a href={`tel:${c.phone.replace(/\s/g, '')}`} className={`display ${p.contactBig}`}>{c.phone}</a></dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd><a href={`mailto:${c.email}`} className={p.contactEmail}>{c.email}</a></dd>
              </div>
              <div>
                <dt>Office</dt>
                <dd>{c.address}</dd>
              </div>
              <div>
                <dt>Post</dt>
                <dd>{c.postal}</dd>
              </div>
              {c.hours ? (
                <div>
                  <dt>Hours</dt>
                  <dd>{c.hours}</dd>
                </div>
              ) : null}
            </dl>
            {data.settings.social?.length ? (
              <ul className={u.chips}>
                {data.settings.social.map((s) => (
                  <li key={s.url}><a href={s.url} className={u.chip} target="_blank" rel="noopener noreferrer">{s.label}</a></li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className={p.contactFormWrap}>
            <h2 className={p.colTitle}>Send us a message</h2>
            <ContactForm />
          </div>
        </div>
      </section>
      <section className={p.map} aria-label="Map">
        <iframe
          title="Map showing the BIGSA office at Changlimithang, Thimphu"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`}
          loading="lazy"
        />
        <a className={p.mapLink} href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`} target="_blank" rel="noopener noreferrer">
          Open a larger map
        </a>
      </section>
    </>
  );
}

/* ======================================================================= search */
const TYPE_LABEL: Record<SearchHit['type'], string> = { sport: 'Sports', news: 'News', event: 'Events', resource: 'Documents', form: 'Forms' };

export function SearchView({ data }: { data: { q: string; type?: string; hits: SearchHit[] } }) {
  const hits = data.type ? data.hits.filter((h) => h.type === data.type) : data.hits;
  const groups = new Map<SearchHit['type'], SearchHit[]>();
  for (const h of hits) groups.set(h.type, [...(groups.get(h.type) ?? []), h]);
  return (
    <>
      <PageHead title="Search" crumbs={[{ href: '/search', label: 'Search' }]}>
        <div className={p.spaced}>
          <SearchPill defaultValue={data.q} defaultType={data.type} />
        </div>
      </PageHead>
      <section className={u.section}>
        <div className="container">
          {!data.q ? (
            <p className={p.resultCount}>Type a word or two, such as “khuru”, “safety” or “team entry”.</p>
          ) : hits.length === 0 ? (
            <div className={u.empty}>
              <h3>Nothing matches “{data.q}”</h3>
              <p>Check the spelling, or try a broader word. Sport names work well, as do terms like Daya, Bacho or Thrimpon.</p>
            </div>
          ) : (
            <>
              <p className={p.resultCount}>
                {hits.length} result{hits.length === 1 ? '' : 's'} for “{data.q}”
                {data.type ? <Link href={`/search?q=${encodeURIComponent(data.q)}`} className={u.textLink}>Search everything</Link> : null}
              </p>
              {[...groups.entries()].map(([type, hits]) => (
                <div key={type} className={p.searchGroup}>
                  <h2 className={p.colTitle}>{TYPE_LABEL[type]}</h2>
                  <ul>
                    {hits.map((h) => (
                      <li key={h.url + h.title}>
                        <Link href={h.url}>{h.title}</Link>
                        <p dangerouslySetInnerHTML={{ __html: sanitizeSnippet(h.snippet) }} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          )}
        </div>
      </section>
    </>
  );
}
