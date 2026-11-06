'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS, displayValue, formatBytes, type ApplicationStatus, type FormDefinition } from '@bigsa/shared';
import { api, useApi } from '@/admin/lib/api';
import { STATUS_TONE } from '@/admin/lib/status';
import { PageHeader, Loading, Field, useToast } from '@/admin/components/ui';

interface Detail {
  id: string; reference: string; status: ApplicationStatus; created_at: string; data: Record<string, unknown>; form_version: FormDefinition;
  applicant_name: string | null; applicant_email: string | null; applicant_phone: string | null;
  form: { id: string; title: string; slug: string };
  files: { id: string; field_key: string; filename: string; mime: string; size: number }[];
  notes: { id: string; author_name: string | null; body: string; kind: 'note' | 'status'; created_at: string }[];
}

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Thimphu', dateStyle: 'medium', timeStyle: 'short' });

export default function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: app, error, mutate } = useApi<Detail>(`/applications/${id}`);
  const toast = useToast();
  const [status, setStatus] = useState<ApplicationStatus | ''>('');
  const [statusNote, setStatusNote] = useState('');
  const [notify, setNotify] = useState(true);
  const [note, setNote] = useState('');
  // Which action is in flight: blocks double submits (duplicate notes, duplicate emails).
  const [busy, setBusy] = useState<'status' | 'note' | null>(null);
  if (!app) return error ? <p className="a-error">{error}</p> : <Loading />;

  const changeStatus = async () => {
    if (!status || busy) return;
    setBusy('status');
    try {
      const res = await api<{ status: ApplicationStatus; note: Detail['notes'][number] }>(`/applications/${id}/status`, {
        method: 'PATCH',
        json: { status, note: statusNote || undefined, notify },
      });
      mutate((a) => ({ ...a, status: res.status, notes: [...a.notes, res.note] }));
      toast(`Status changed to ${APPLICATION_STATUS_LABELS[res.status]}`);
      setStatus('');
      setStatusNote('');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };
  const addNote = async () => {
    if (!note.trim() || busy) return;
    setBusy('note');
    try {
      const saved = await api<Detail['notes'][number]>(`/applications/${id}/notes`, { method: 'POST', json: { body: note } });
      mutate((a) => ({ ...a, notes: [...a.notes, saved] }));
      setNote('');
      toast('Note added');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        title={app.reference}
        sub={<><Link href="/admin/applications">← Applications</Link> · {app.form.title}, submitted {when(app.created_at)}</>}
        actions={<><span className={`a-pill a-pill--${STATUS_TONE[app.status]} a-pill--lg`}>{APPLICATION_STATUS_LABELS[app.status]}</span><button type="button" className="a-btn a-btn--ghost" onClick={() => window.print()}>Print</button></>}
      />
      <div className="a-split">
        <div className="a-stack">
          {app.form_version.steps.map((step) => {
            const fields = step.fields.filter((f) => !['heading', 'paragraph'].includes(f.type));
            if (!fields.length) return null;
            return (
              <section key={step.title} className="a-card">
                <h2 className="a-card__title">{step.title}</h2>
                <dl className="a-dl">
                  {fields.map((f) => {
                    if (f.type === 'file') {
                      const files = app.files.filter((x) => x.field_key === f.key);
                      return (
                        <div key={f.key}>
                          <dt>{f.label}</dt>
                          <dd>
                            {files.length ? files.map((x) => (
                              <a key={x.id} className="a-filelink" href={`/api/admin/applications/${app.id}/files/${x.id}`}>
                                {x.filename} <span className="a-muted">({formatBytes(x.size)})</span>
                              </a>
                            )) : '—'}
                          </dd>
                        </div>
                      );
                    }
                    if (f.type === 'repeater') {
                      const rows = (app.data[f.key] as Record<string, unknown>[]) ?? [];
                      return (
                        <div key={f.key} className="a-dl__wide">
                          <dt>{f.label} ({rows.length})</dt>
                          <dd>
                            <table className="a-table a-table--compact">
                              <thead><tr><th>#</th>{f.fields?.map((s) => <th key={s.key}>{s.label}</th>)}</tr></thead>
                              <tbody>
                                {rows.map((r, i) => (
                                  <tr key={i}><td>{i + 1}</td>{f.fields?.map((s) => <td key={s.key}>{displayValue(s, r[s.key]) || '—'}</td>)}</tr>
                                ))}
                              </tbody>
                            </table>
                          </dd>
                        </div>
                      );
                    }
                    return (
                      <div key={f.key}>
                        <dt>{f.label}</dt>
                        <dd>{displayValue(f, app.data[f.key]) || '—'}</dd>
                      </div>
                    );
                  })}
                </dl>
              </section>
            );
          })}
        </div>

        <aside className="a-stack">
          <section className="a-card">
            <h2 className="a-card__title">Update status</h2>
            <Field label="New status">
              <select className="a-input" value={status} onChange={(e) => setStatus(e.target.value as ApplicationStatus)}>
                <option value="">Choose…</option>
                {APPLICATION_STATUSES.filter((s) => s !== app.status).map((s) => <option key={s} value={s}>{APPLICATION_STATUS_LABELS[s]}</option>)}
              </select>
            </Field>
            <Field label="Message to include" hint="Optional. Recorded in the history.">
              <textarea className="a-input a-textarea" rows={3} value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
            </Field>
            {app.applicant_email ? (
              <label className="a-check">
                <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
                <span>Email the applicant at {app.applicant_email}</span>
              </label>
            ) : null}
            <button type="button" className="a-btn a-btn--primary" disabled={!status || busy !== null} onClick={changeStatus}>{busy === 'status' ? 'Updating…' : 'Update status'}</button>
          </section>

          <section className="a-card">
            <h2 className="a-card__title">Internal notes and history</h2>
            <ol className="a-timeline">
              {app.notes.map((n) => (
                <li key={n.id} className={n.kind === 'status' ? 'is-status' : ''}>
                  <p>{n.body}</p>
                  <span className="a-muted a-small">{n.author_name ?? 'System'}, {when(n.created_at)}</span>
                </li>
              ))}
            </ol>
            <Field label="Add a note" hint="Only BIGSA staff can see notes.">
              <textarea className="a-input a-textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <button type="button" className="a-btn a-btn--ghost" disabled={!note.trim() || busy !== null} onClick={addNote}>{busy === 'note' ? 'Adding…' : 'Add note'}</button>
          </section>

          <section className="a-card">
            <h2 className="a-card__title">Contact</h2>
            <p>{app.applicant_name ?? '—'}</p>
            {app.applicant_email ? <p><a href={`mailto:${app.applicant_email}?subject=${encodeURIComponent(`Your BIGSA application ${app.reference}`)}`}>{app.applicant_email}</a></p> : null}
            {app.applicant_phone ? <p><a href={`tel:${app.applicant_phone}`}>{app.applicant_phone}</a></p> : null}
          </section>
        </aside>
      </div>
    </>
  );
}
