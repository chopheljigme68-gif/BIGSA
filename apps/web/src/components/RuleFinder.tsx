'use client';

import { Fragment, useMemo, useState } from 'react';
import type { RuleSection } from '@bigsa/shared';
import s from './rules.module.css';

/** Rules as collapsible articles, with a filter that searches every clause. */
export function RuleFinder({ sections, sportName }: { sections: RuleSection[]; sportName: string }) {
  const [q, setQ] = useState('');
  const [openAll, setOpenAll] = useState<boolean | null>(null);
  const term = q.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!term) return sections.map((sec) => ({ ...sec, hits: sec.items }));
    return sections
      .map((sec) => ({ ...sec, hits: sec.title.toLowerCase().includes(term) ? sec.items : sec.items.filter((i) => i.toLowerCase().includes(term)) }))
      .filter((sec) => sec.hits.length);
  }, [sections, term]);

  const count = filtered.reduce((n, sec) => n + sec.hits.length, 0);

  return (
    <div className={s.finder}>
      <div className={s.bar}>
        <label className={s.search}>
          <span className="visually-hidden">Search the {sportName} rules</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
          <input type="search" placeholder={`Search the rules, e.g. “Daya” or “late”`} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <button type="button" className={s.toggle} onClick={() => setOpenAll((o) => !o)}>
          {openAll ? 'Collapse all' : 'Expand all'}
        </button>
      </div>
      <p className={s.count} aria-live="polite">
        {term ? (count ? `${count} clause${count === 1 ? '' : 's'} mention “${q.trim()}”` : `No clause mentions “${q.trim()}”. Try a shorter word.`) : `${sections.length} articles`}
      </p>
      <div className={s.list}>
        {filtered.map((sec) => (
          <details key={sec.title} className={s.article} open={term ? true : openAll ?? undefined}>
            <summary>
              <span>{sec.title}</span>
              <span className={s.n}>{sec.hits.length}</span>
            </summary>
            <ol>
              {sec.hits.map((item) => (
                <li key={item}>
                  <Highlight text={item} term={term} />
                </li>
              ))}
            </ol>
          </details>
        ))}
      </div>
    </div>
  );
}

function Highlight({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'));
  return (
    <>
      {parts.map((part, i) => (part.toLowerCase() === term ? <mark key={i}>{part}</mark> : <Fragment key={i}>{part}</Fragment>))}
    </>
  );
}
