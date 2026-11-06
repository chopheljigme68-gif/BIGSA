'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS, type ApplicationStatus } from '@bigsa/shared';
import { useApi } from '@/admin/lib/api';
import { STATUS_TONE } from '@/admin/lib/status';
import { PageHeader, Empty, Loading } from '@/admin/components/ui';

interface Row { id: string; reference: string; status: ApplicationStatus; applicant_name: string | null; applicant_email: string | null; applicant_phone: string | null; created_at: string; form: { id: string; title: string }; file_count: number }

export default function ApplicationsPage() {
  const [filters, setFilters] = useState({ form: '', status: '', q: '', from: '', to: '' });
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setFilters((f) => ({ ...f, status: p.get('status') ?? '', form: p.get('form') ?? '' }));
  }, []);
  useEffect(() => {
    const t = setTimeout(() => (setFilters((f) => ({ ...f, q })), setPage(1)), 250);
    return () => clearTimeout(t);
  }, [q]);

  const qs = new URLSearchParams(Object.entries({ ...filters, page: String(page) }).filter(([, v]) => v)).toString();
  const { data, loading } = useApi<{ items: Row[]; total: number; pageSize: number }>(`/applications?${qs}`);
  const { data: forms } = useApi<{ id: string; title: string }[]>('/forms');
  const set = (k: keyof typeof filters, v: string) => (setFilters((f) => ({ ...f, [k]: v })), setPage(1));
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const exportQs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();

  return (
    <>
      <PageHeader
        title="Applications"
        sub="Everything submitted through the online forms. Personal information here is never public."
        actions={
          filters.form ? (
            <a className="a-btn a-btn--ghost" href={`/api/admin/applications/export.csv?${exportQs}`}>
              Export CSV
            </a>
          ) : (
            <span className="a-muted a-small">Choose a form to export its applications</span>
          )
        }
      />
      <div className="a-toolbar a-toolbar--wrap">
        <input className="a-input a-input--search" type="search" placeholder="Reference, name, email or any answer" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="a-input a-input--auto" value={filters.form} onChange={(e) => set('form', e.target.value)} aria-label="Form">
          <option value="">Every form</option>
          {forms?.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
        </select>
        <select className="a-input a-input--auto" value={filters.status} onChange={(e) => set('status', e.target.value)} aria-label="Status">
          <option value="">Any status</option>
          {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{APPLICATION_STATUS_LABELS[s]}</option>)}
        </select>
        <label className="a-inline">From <input className="a-input a-input--auto" type="date" value={filters.from} onChange={(e) => set('from', e.target.value)} /></label>
        <label className="a-inline">To <input className="a-input a-input--auto" type="date" value={filters.to} onChange={(e) => set('to', e.target.value)} /></label>
      </div>
      {loading && !data ? <Loading /> : null}
      {data && !data.items.length ? <Empty title="No applications match"><p>Change the filters, or wait for the first submission.</p></Empty> : null}
      {data?.items.length ? (
        <div className="a-tablewrap">
          <table className="a-table">
            <thead>
              <tr>
                <th style={{ width: 160 }}>Reference</th>
                <th>Applicant</th>
                <th>Form</th>
                <th style={{ width: 80 }}>Files</th>
                <th style={{ width: 170 }}>Submitted</th>
                <th style={{ width: 170 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((a) => (
                <tr key={a.id}>
                  <td><Link href={`/admin/applications/${a.id}`} className="a-strong-link">{a.reference}</Link></td>
                  <td>{a.applicant_name ?? '—'}<br /><span className="a-muted a-small">{a.applicant_email ?? a.applicant_phone ?? ''}</span></td>
                  <td>{a.form.title}</td>
                  <td>{a.file_count}</td>
                  <td>{new Date(a.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Thimphu', dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td><span className={`a-pill a-pill--${STATUS_TONE[a.status]}`}>{APPLICATION_STATUS_LABELS[a.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {pages > 1 ? (
        <div className="a-pager">
          <button type="button" className="a-btn a-btn--ghost a-btn--sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span>Page {page} of {pages}</span>
          <button type="button" className="a-btn a-btn--ghost a-btn--sm" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      ) : null}
    </>
  );
}
