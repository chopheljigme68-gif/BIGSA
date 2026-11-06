'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { SearchHit } from '@bigsa/shared';
import { NAV, type ShellData } from '@/lib/site';
import { sanitizeSnippet } from '@/lib/snippet';
import s from './header.module.css';

const TYPE_LABEL: Record<SearchHit['type'], string> = { sport: 'Sport', news: 'News', event: 'Event', resource: 'Document', form: 'Form' };

export function SiteHeader({ sports }: { sports: ShellData['sports'] }) {
  const pathname = usePathname() ?? '/';
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // Hide the header while reading down the page; bring it back on any scroll up.
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      if (Math.abs(y - lastY) > 6) {
        setHidden(y > lastY && y > 320);
        lastY = y;
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close overlays on navigation.
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen || searchOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen, searchOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      <header className={`${s.header} ${scrolled ? s.scrolled : ''} ${hidden && !menuOpen && !searchOpen ? s.hidden : ''}`}>
        <div className={`container ${s.bar}`}>
          <Link href="/" className={s.brand} aria-label="BIGSA home">
            <img src="/brand/bigsa-logo.png" alt="" width={44} height={41} className={s.logo} />
            <span className={s.wordmark}>BIGSA</span>
          </Link>

          <nav className={s.nav} aria-label="Main">
            <ul>
              {NAV.map((item) =>
                item.href === '/sports' ? (
                  <li key={item.href} className={s.hasMega}>
                    <Link href={item.href} className={s.navLink} aria-current={isActive(item.href) ? 'page' : undefined}>
                      {item.label}
                      <svg className={s.chev} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                    </Link>
                    <div className={s.mega}>
                      <div className={s.megaInner}>
                        <p className={s.megaIntro}>
                          The indigenous games and sports of Bhutan, from Dha to Thab-Thenni.{' '}
                          <Link href="/sports">See all twelve</Link>
                        </p>
                        <ul className={s.megaList}>
                          {sports.map((sp) => (
                            <li key={sp.slug}>
                              <Link href={`/sports/${sp.slug}`} className={sp.has_content ? '' : s.megaQuiet}>
                                <span className={s.megaName}>{sp.name}</span>
                                {sp.name_dz ? <span className={`dz ${s.megaDz}`}>{sp.name_dz}</span> : null}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </li>
                ) : (
                  <li key={item.href}>
                    <Link href={item.href} className={s.navLink} aria-current={isActive(item.href) ? 'page' : undefined}>
                      {item.label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>

          <div className={s.actions}>
            <button type="button" className={s.searchBtn} onClick={() => setSearchOpen(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
              <span className={s.searchText}>Search</span>
            </button>
            <Link href="/forms" className={s.cta}>
              Apply online
            </Link>
            <button type="button" className={s.menuBtn} onClick={() => setMenuOpen(true)} aria-expanded={menuOpen} aria-controls="mobile-menu">
              Menu
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? <MobileMenu onClose={() => setMenuOpen(false)} isActive={isActive} /> : null}
      {searchOpen ? <SearchDialog onClose={() => setSearchOpen(false)} /> : null}
    </>
  );
}

function MobileMenu({ onClose, isActive }: { onClose: () => void; isActive: (h: string) => boolean }) {
  return (
    <div id="mobile-menu" className={s.mobile} role="dialog" aria-modal="true" aria-label="Menu">
      <div className={`container ${s.mobileTop}`}>
        <span className={s.wordmark}>BIGSA</span>
        <button type="button" className={s.closeBtn} onClick={onClose} autoFocus>
          Close
        </button>
      </div>
      <nav className="container" aria-label="Main">
        <ul className={s.mobileList}>
          {NAV.map((item, i) => (
            <li key={item.href} style={{ animationDelay: `${i * 40}ms` }}>
              <Link href={item.href} className="display" aria-current={isActive(item.href) ? 'page' : undefined} onClick={onClose}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/forms" className={s.mobileCta} onClick={onClose}>
          Apply online
        </Link>
      </nav>
    </div>
  );
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal });
        setHits(res.ok ? await res.json() : []);
        setActive(0);
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const go = (url: string) => {
    onClose();
    router.push(url);
  };

  return (
    <div className={s.searchBackdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={s.searchPanel} role="dialog" aria-modal="true" aria-label="Search">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            if (hits && hits[active]) go(hits[active].url);
            else if (q.trim()) go(`/search?q=${encodeURIComponent(q.trim())}`);
          }}
        >
          <label htmlFor="site-search" className="visually-hidden">
            Search sports, rules, news, events and forms
          </label>
          <input
            ref={inputRef}
            id="site-search"
            className={s.searchInput}
            type="search"
            autoComplete="off"
            placeholder="Search sports, rules, news and forms"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (!hits?.length) return;
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            }}
            aria-controls="search-results"
            aria-activedescendant={hits?.length ? `hit-${active}` : undefined}
          />
        </form>
        <div id="search-results" className={s.results} aria-live="polite">
          {loading && !hits ? <p className={s.searchHint}>Searching…</p> : null}
          {hits && hits.length === 0 ? <p className={s.searchHint}>Nothing matches “{q}”. Try a sport name such as khuru, or a word like “safety”.</p> : null}
          {!hits && !loading ? <p className={s.searchHint}>Try “dhobji”, “team entry” or “Bacho”.</p> : null}
          {hits?.length ? (
            <ul role="listbox">
              {hits.slice(0, 8).map((h, i) => (
                <li key={h.url + i} id={`hit-${i}`} role="option" aria-selected={i === active}>
                  <a
                    href={h.url}
                    className={i === active ? s.hitActive : undefined}
                    onMouseEnter={() => setActive(i)}
                    onClick={(e) => {
                      e.preventDefault();
                      go(h.url);
                    }}
                  >
                    <span className={s.hitType}>{TYPE_LABEL[h.type]}</span>
                    <span className={s.hitTitle}>{h.title}</span>
                    {/* Snippet contains only <mark> tags produced by Postgres ts_headline over escaped text. */}
                    <span className={s.hitSnippet} dangerouslySetInnerHTML={{ __html: sanitizeSnippet(h.snippet) }} />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <p className={s.searchFoot}>
          <kbd>↑</kbd> <kbd>↓</kbd> to move, <kbd>Enter</kbd> to open, <kbd>Esc</kbd> to close
        </p>
      </div>
    </div>
  );
}
