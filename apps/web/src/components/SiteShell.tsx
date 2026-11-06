import Link from 'next/link';
import type { ReactNode } from 'react';
import { NAV, type ShellData } from '@/lib/site';
import { SiteHeader } from './SiteHeader';
import { PageTracker } from './PageTracker';
import { MotionEffects } from './motion/MotionEffects';
import s from './shell.module.css';

/** Header and footer wrapped around every public page. */
export function SiteShell({ data, children }: { data: ShellData; children: ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader sports={data.sports} />
      <main id="main">{children}</main>
      <SiteFooter data={data} />
      <PageTracker />
      <MotionEffects />
    </>
  );
}

function SiteFooter({ data }: { data: ShellData }) {
  const c = data.contact;
  return (
    <footer className={s.footer}>
      <div className={`container ${s.footTop}`}>
        <div className={s.footBrand}>
          <Link href="/" className={s.footLogo} aria-label="BIGSA home">
            <img src="/brand/bigsa-logo.png" alt="" width={52} height={49} />
            <span>BIGSA</span>
          </Link>
          <p className={`display ${s.motto}`}>{data.motto}</p>
          {data.nameDz ? <p className={`dz ${s.nameDz}`} lang="dz">{data.nameDz}</p> : null}
        </div>
        <nav aria-label="Footer" className={s.footNav}>
          <ul>
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href}>{n.label}</Link>
              </li>
            ))}
            <li>
              <Link href="/forms/downloads">Rules & downloads</Link>
            </li>
            <li>
              <Link href="/search">Search</Link>
            </li>
          </ul>
        </nav>
        {c ? (
          <address className={s.footContact}>
            <p>{c.address}</p>
            <p>{c.postal}</p>
            <p>
              <a href={`tel:${c.phone.replace(/\s/g, '')}`}>{c.phone}</a>
            </p>
            <p>
              <a href={`mailto:${c.email}`}>{c.email}</a>
            </p>
            {data.social.length ? (
              <ul className={s.social}>
                {data.social.map((so) => (
                  <li key={so.url}>
                    <a href={so.url} target="_blank" rel="noopener noreferrer">
                      {so.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </address>
        ) : null}
      </div>
      <div className={`container ${s.footBottom}`}>
        <p>© {new Date().getFullYear()} Bhutan Indigenous Games and Sports Association</p>
        <p className={s.footLinks}>
          <Link href="/who-we-are#affiliations">Affiliations</Link>
          <Link href="/contact">Contact</Link>
        </p>
      </div>
    </footer>
  );
}
