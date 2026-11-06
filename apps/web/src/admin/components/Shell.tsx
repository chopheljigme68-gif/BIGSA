'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { api, ApiError } from '@/admin/lib/api';
import { SessionContext, ToastProvider, type Me } from './ui';

const NAV: { group: string; items: { href: string; label: string; icon: string }[] }[] = [
  { group: '', items: [{ href: '/admin', label: 'Dashboard', icon: 'M3 12l9-8 9 8M5 10v10h14V10' }] },
  {
    group: 'Content',
    items: [
      { href: '/admin/news', label: 'News', icon: 'M4 5h16v14H4zM8 9h8M8 13h8M8 17h5' },
      { href: '/admin/events', label: 'Events & archive', icon: 'M4 6h16v14H4zM4 10h16M9 3v4M15 3v4' },
      { href: '/admin/sports', label: 'Sports', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8z' },
      { href: '/admin/team', label: 'Who’s who', icon: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3 3-5 6-5s6 2 6 5M16 11a3 3 0 1 0 0-6M18 15c2 .5 4 2 4 5' },
      { href: '/admin/resources', label: 'Documents', icon: 'M6 3h9l5 5v13H6zM14 3v6h6' },
      { href: '/admin/media', label: 'Media library', icon: 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4' },
    ],
  },
  {
    group: 'Applications',
    items: [
      { href: '/admin/applications', label: 'Applications', icon: 'M5 4h14v16H5zM9 8h6M9 12h6M9 16h3' },
      { href: '/admin/forms', label: 'Online forms', icon: 'M4 6h16M4 12h16M4 18h10' },
      { href: '/admin/messages', label: 'Messages', icon: 'M4 6h16v12H4zM4 6l8 7 8-7' },
    ],
  },
  {
    group: 'Settings',
    items: [
      { href: '/admin/settings', label: 'Site content', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-1-3-2 .5-1.5-1.5.5-2-3-1-1 2h-2l-1-2-3 1 .5 2L6 8.5 4 8l-1 3 2 1v0l-2 1 1 3 2-.5L7.5 16 7 18l3 1 1-2h2l1 2 3-1-.5-2 1.5-1.5 2 .5 1-3z' },
      { href: '/admin/users', label: 'Admin accounts', icon: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6' },
      { href: '/admin/audit', label: 'Audit log', icon: 'M12 8v4l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z' },
    ],
  },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/';
  const [me, setMe] = useState<Me | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState(false);

  // Load the signed-in user. Only a real "not signed in" answer goes to the sign-in
  // page; if the API is unreachable we say so and offer a retry instead of redirecting.
  useEffect(() => {
    let live = true;
    setFailure(null);
    api<Me>('/auth/me')
      .then((u) => live && setMe(u))
      .catch((e) => {
        if (!live) return;
        if (e instanceof ApiError && e.status === 401) {
          window.location.replace(`/admin/login?next=${encodeURIComponent(window.location.pathname)}`);
        } else {
          setFailure((e as Error).message || 'The server did not answer.');
        }
      });
    return () => {
      live = false;
    };
  }, [attempt]);

  useEffect(() => setOpen(false), [pathname]);

  const signOut = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.href = '/admin/login';
  };

  if (failure) {
    return (
      <main className="a-login">
        <div className="a-login__card" role="alert">
          <h1>Can’t reach the BIGSA server</h1>
          <p className="a-muted">{failure}</p>
          <p className="a-muted">If you are running the site on your computer, check that the API is running (the terminal running npm run dev shows it).</p>
          <button type="button" className="a-btn a-btn--primary" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
        </div>
      </main>
    );
  }
  if (!me) return <div className="a-boot" aria-label="Loading" />;

  const active = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(href + '/'));

  return (
    <SessionContext.Provider value={me}>
      <ToastProvider>
        <div className={`a-app ${open ? 'a-app--nav' : ''}`}>
          <aside className="a-side">
            <Link href="/admin" className="a-brand">
              <img src="/brand/bigsa-logo.png" alt="" width={36} height={34} />
              <span>
                BIGSA <small>Admin</small>
              </span>
            </Link>
            <nav aria-label="Admin">
              {NAV.map((g) => {
                const items = g.items;
                return (
                  <div key={g.group} className="a-nav__group">
                    {g.group ? <p className="a-nav__label">{g.group}</p> : null}
                    <ul>
                      {items.map((i) => (
                        <li key={i.href}>
                          <Link href={i.href} className="a-nav__link" aria-current={active(i.href) ? 'page' : undefined}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
                              <path d={i.icon} />
                            </svg>
                            {i.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </nav>
            <div className="a-side__foot">
              <a href="/" target="_blank" rel="noopener" className="a-nav__link">
                View public site
              </a>
            </div>
          </aside>
          <div className="a-main">
            <header className="a-top">
              <button type="button" className="a-btn a-btn--ghost a-btn--sm a-top__menu" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
                Menu
              </button>
              <div className="a-top__user">
                <span className="a-avatar" aria-hidden="true">
                  {me.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('')}
                </span>
                <span>
                  <strong>{me.name}</strong>
                  <small>Administrator</small>
                </span>
                <Link href="/admin/account" className="a-btn a-btn--ghost a-btn--sm">
                  Account
                </Link>
                <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={signOut}>
                  Sign out
                </button>
              </div>
            </header>
            <main className="a-content">{children}</main>
          </div>
        </div>
      </ToastProvider>
    </SessionContext.Provider>
  );
}
