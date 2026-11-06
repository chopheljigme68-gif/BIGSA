import Link from 'next/link';
import type { ReactNode } from 'react';
import u from './ui.module.css';

export function PageHead({
  title,
  lede,
  crumbs = [],
  children,
}: {
  title: ReactNode;
  lede?: ReactNode;
  crumbs?: { href: string; label: string }[];
  children?: ReactNode;
}) {
  return (
    <header className={u.pageHead}>
      <div className="container">
        {crumbs.length ? (
          <nav aria-label="Breadcrumb">
            <ol className={u.crumbs}>
              <li>
                <Link href="/">Home</Link>
              </li>
              {crumbs.map((c) => (
                <li key={c.href}>
                  <Link href={c.href}>{c.label}</Link>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        <h1 className={`display ${u.pageHeadTitle}`}>{title}</h1>
        {lede ? <p className={u.pageHeadLede}>{lede}</p> : null}
        {children}
      </div>
    </header>
  );
}
