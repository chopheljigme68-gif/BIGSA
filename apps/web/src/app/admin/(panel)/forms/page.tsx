'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { formatDate, formStatus, type FormStatus } from '@bigsa/shared';
import { api, useApi, optimistic } from '@/admin/lib/api';
import { PageHeader, Loading, Empty, useToast } from '@/admin/components/ui';

interface Row { id: string; slug: string; title: string; category: string; status: FormStatus; is_active: boolean; opens_at: string | null; closes_at: string | null; application_count: number; new_count: number }
const TONE: Record<FormStatus, string> = { open: 'ok', upcoming: 'warn', closed: 'neutral', inactive: 'neutral' };
const LABEL: Record<FormStatus, string> = { open: 'Accepting applications', upcoming: 'Opens later', closed: 'Closed', inactive: 'Switched off' };

export default function FormsPage() {
  const { data, error, mutate } = useApi<Row[]>('/forms');
  const toast = useToast();
  // One request at a time per form, so fast double clicks can't race each other.
  const pending = useRef(new Set<string>());

  const patch = (id: string, fn: (r: Row) => Row) => mutate((rows) => rows.map((r) => (r.id === id ? fn(r) : r)));

  const toggle = async (f: Row) => {
    if (pending.current.has(f.id)) return;
    pending.current.add(f.id);
    const is_active = !f.is_active;
    // The switch and status flip instantly; the server's answer then confirms them.
    const ok = await optimistic(
      () => patch(f.id, (r) => ({ ...r, is_active, status: formStatus({ ...r, is_active }) })),
      async () => {
        const saved = await api<Row>(`/forms/${f.id}/active`, { method: 'PATCH', json: { is_active } });
        patch(f.id, (r) => ({ ...r, is_active: saved.is_active, status: saved.status }));
      },
      () => patch(f.id, () => f),
      (msg) => toast(`${f.title} wasn’t changed: ${msg}`, 'error'),
    );
    pending.current.delete(f.id);
    if (ok) toast(is_active ? `${f.title} switched on` : `${f.title} switched off`);
  };

  return (
    <>
      <PageHeader
        title="Online forms"
        sub="Switch forms on and off, set opening and closing dates, and build new forms without a developer."
        actions={<Link href="/admin/forms/new" className="a-btn a-btn--primary">New form</Link>}
      />
      {error && !data ? <p className="a-error">{error}</p> : null}
      {!data ? (error ? null : <Loading />) : !data.length ? <Empty title="No forms yet"><p>Create the first online form.</p></Empty> : (
        <div className="a-tablewrap">
          <table className="a-table">
            <thead>
              <tr><th>Form</th><th style={{ width: 200 }}>Status</th><th style={{ width: 200 }}>Window</th><th style={{ width: 150 }}>Applications</th><th style={{ width: 210 }} /></tr>
            </thead>
            <tbody>
              {data.map((f) => (
                <tr key={f.id}>
                  <td><Link href={`/admin/forms/${f.id}`} className="a-strong-link">{f.title}</Link><br /><span className="a-muted a-small">{f.category}</span></td>
                  <td><span className={`a-pill a-pill--${TONE[f.status]}`}>{LABEL[f.status]}</span></td>
                  <td className="a-small">{f.opens_at || f.closes_at ? `${f.opens_at ? formatDate(f.opens_at) : 'Now'} – ${f.closes_at ? formatDate(f.closes_at) : 'no end'}` : 'Always open'}</td>
                  <td><Link href={`/admin/applications?form=${f.id}`}>{f.application_count}</Link>{f.new_count ? <span className="a-pill a-pill--info" style={{ marginLeft: 8 }}>{f.new_count} new</span> : null}</td>
                  <td className="a-row">
                    <button type="button" className="a-switch" role="switch" aria-checked={f.is_active} onClick={() => toggle(f)} aria-label={`${f.title} on or off`}><span /></button>
                    {f.is_active ? <a className="a-btn a-btn--ghost a-btn--sm" href={`/forms/${f.slug}`} target="_blank" rel="noopener">Open</a> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
