'use client';

import Link from 'next/link';
import { APPLICATION_STATUS_LABELS, PENDING_LABELS, formatDate, type ApplicationStatus } from '@bigsa/shared';
import { useApi } from '@/admin/lib/api';
import { PageHeader, Loading, useMe } from '@/admin/components/ui';
import { STATUS_TONE } from '@/admin/lib/status';

interface Dashboard {
  counts: Record<string, number>;
  recentApps: { id: string; reference: string; status: ApplicationStatus; applicant_name: string | null; created_at: string; form_title: string }[];
  recentMessages: { id: string; name: string; subject: string; is_read: boolean; created_at: string }[];
  topPages: { path: string; views: number }[];
  downloads: { id: string; title: string; download_count: number }[];
  pending: string[];
}

export default function DashboardPage() {
  const me = useMe()!; // signed-in administrator
  const { data } = useApi<Dashboard>('/dashboard');
  if (!data) return <Loading />;
  const c = data.counts;
  const tiles = [
    { label: 'New applications', value: c.new_applications, href: '/admin/applications?status=received', hot: c.new_applications > 0 },
    { label: 'Unread messages', value: c.unread_messages, href: '/admin/messages', hot: c.unread_messages > 0 },
    { label: 'Published news', value: c.published_news, href: '/admin/news', note: c.draft_news ? `${c.draft_news} draft${c.draft_news > 1 ? 's' : ''}` : undefined },
    { label: 'Upcoming events', value: c.upcoming_events, href: '/admin/events' },
    { label: 'Forms accepting applications', value: c.active_forms, href: '/admin/forms' },
    { label: 'Page views, last 30 days', value: c.views_30d },
  ].filter(Boolean) as { label: string; value: number; href?: string; hot?: boolean; note?: string }[];

  return (
    <>
      <PageHeader title={`Kuzuzangpo, ${me.name.split(' ')[0]}`} sub="Here’s what needs attention on the website today." />
      <div className="a-tiles">
        {tiles.map((t) => {
          const body = (
            <>
              <span className="a-tile__value">{t.value}</span>
              <span className="a-tile__label">{t.label}</span>
              {t.note ? <span className="a-tile__note">{t.note}</span> : null}
            </>
          );
          return t.href ? (
            <Link key={t.label} href={t.href} className={`a-tile ${t.hot ? 'a-tile--hot' : ''}`}>{body}</Link>
          ) : (
            <div key={t.label} className="a-tile">{body}</div>
          );
        })}
      </div>

      <div className="a-grid2">
        <section className="a-card">
          <header className="a-card__head">
            <h2>Latest applications</h2>
            <Link href="/admin/applications">All applications</Link>
          </header>
          {data.recentApps.length ? (
            <ul className="a-feed">
              {data.recentApps.map((a) => (
                <li key={a.id}>
                  <Link href={`/admin/applications/${a.id}`}>
                    <strong>{a.reference}</strong>
                    <span>{a.applicant_name ?? 'Applicant'}, {a.form_title}</span>
                  </Link>
                  <span className={`a-pill a-pill--${STATUS_TONE[a.status]}`}>{APPLICATION_STATUS_LABELS[a.status]}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="a-muted">No applications yet. They appear here as soon as someone submits a form.</p>
          )}
        </section>

        <section className="a-card">
          <header className="a-card__head">
            <h2>Messages</h2>
            <Link href="/admin/messages">Inbox</Link>
          </header>
          {data.recentMessages.length ? (
            <ul className="a-feed">
              {data.recentMessages.map((m) => (
                <li key={m.id}>
                  <Link href="/admin/messages">
                    <strong>{m.subject}</strong>
                    <span>{m.name}, {formatDate(m.created_at)}</span>
                  </Link>
                  {!m.is_read ? <span className="a-pill a-pill--info">New</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="a-muted">No messages from the contact form yet.</p>
          )}
        </section>

        {data.pending.length ? (
          <section className="a-card a-card--warn">
            <header className="a-card__head">
              <h2>Content BIGSA still needs to supply</h2>
              <Link href="/admin/settings">Site content</Link>
            </header>
            <ul className="a-checklist">
              {data.pending.map((k) => (
                <li key={k}>{PENDING_LABELS[k] ?? k}</li>
              ))}
            </ul>
            <p className="a-muted a-small">Untick items in Site content once they’re done.</p>
          </section>
        ) : null}

        <section className="a-card">
          <header className="a-card__head">
            <h2>Most visited, last 30 days</h2>
          </header>
          {data.topPages.length ? (
            <ol className="a-bars">
              {data.topPages.map((p) => (
                <li key={p.path} style={{ ['--w' as string]: `${(p.views / data.topPages[0].views) * 100}%` }}>
                  <span>{p.path}</span>
                  <strong>{p.views}</strong>
                </li>
              ))}
            </ol>
          ) : (
            <p className="a-muted">Visits are counted from the day the site goes live.</p>
          )}
          {data.downloads.length ? (
            <>
              <h3 className="a-subhead">Top downloads</h3>
              <ol className="a-bars">
                {data.downloads.map((d) => (
                  <li key={d.id} style={{ ['--w' as string]: `${(d.download_count / data.downloads[0].download_count) * 100}%` }}>
                    <span>{d.title}</span>
                    <strong>{d.download_count}</strong>
                  </li>
                ))}
              </ol>
            </>
          ) : null}
        </section>
      </div>
    </>
  );
}
