'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseMarkdown, type RuleSection } from '@bigsa/shared';
import { api, useApi, useDebounced, optimistic, ApiError, toLocalInput, fromLocalInput } from '@/admin/lib/api';
import type { EntityConfig, FieldDef, SubField } from '@/admin/lib/entities';
import { PageHeader, Field, Empty, Loading, useToast, useConfirm } from './ui';
import { ImageField, FileField, GalleryField, thumb } from './MediaPicker';

/** The public site is the same origin, so public links are plain paths. */
const SITE = '';

/* ================================================================== list */
export function EntityList({ cfg }: { cfg: EntityConfig }) {
  const [q, setQ] = useState('');
  const debounced = useDebounced(q.trim(), 250);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [debounced]);
  // Sports and team are short lists ordered by hand: load them whole so the order
  // being edited is always the complete order.
  const reorderable = cfg.name === 'sports' || cfg.name === 'team';
  const pageSize = reorderable ? 200 : 25;
  const path = `/${cfg.name}?page=${page}&pageSize=${pageSize}${debounced ? `&q=${encodeURIComponent(debounced)}` : ''}${status ? `&status=${status}` : ''}`;
  const { data, loading, error, mutate } = useApi<{ items: any[]; total: number; pageSize: number }>(path);
  const router = useRouter();
  const toast = useToast();
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  // Reordering a filtered list would renumber only the visible rows, so arrows are
  // shown only when the full, unfiltered list is on screen.
  const canReorder = reorderable && !debounced && !status && pages === 1;
  const saveOrder = useRef(Promise.resolve());

  const move = (i: number, d: number) => {
    if (!data) return;
    const before = data.items;
    const items = [...before];
    const [x] = items.splice(i, 1);
    items.splice(i + d, 0, x);
    const ids = items.map((it) => it.id);
    // Rows move instantly; saves are queued so quick successive clicks reach the server in order.
    mutate((cur) => ({ ...cur, items }));
    saveOrder.current = saveOrder.current.then(() =>
      optimistic(
        () => {},
        () => api(`/${cfg.name}/reorder`, { method: 'POST', json: { ids } }),
        () => mutate((cur) => ({ ...cur, items: before })),
        (msg) => toast(`Order not saved: ${msg}`, 'error'),
      ).then(() => undefined),
    );
  };

  return (
    <>
      <PageHeader
        title={cfg.title}
        sub={cfg.description}
        actions={
          <Link href={`/admin/${cfg.name}/new`} className="a-btn a-btn--primary">
            New {cfg.singular}
          </Link>
        }
      />
      <div className="a-toolbar">
        <input className="a-input a-input--search" type="search" placeholder={`Search ${cfg.title.toLowerCase()}`} value={q} onChange={(e) => setQ(e.target.value)} />
        {cfg.statusFilters ? (
          <div className="a-seg" role="group" aria-label="Filter">
            {[{ value: '', label: 'All' }, ...cfg.statusFilters].map((f) => (
              <button key={f.value} type="button" aria-pressed={status === f.value} onClick={() => (setStatus(f.value), setPage(1))}>
                {f.label}
              </button>
            ))}
          </div>
        ) : null}
        <span className="a-muted a-toolbar__count" aria-live="polite">
          {loading && data ? 'Updating…' : data ? `${data.total} ${data.total === 1 ? cfg.singular : cfg.singular + 's'}` : ''}
        </span>
      </div>
      {error ? <p className="a-error">{error}</p> : null}
      {loading && !data ? <Loading /> : null}
      {data && data.items.length === 0 ? (
        <Empty title={debounced || status ? 'Nothing matches' : `No ${cfg.singular}s yet`}>
          <p>{debounced || status ? 'Try a different search or filter.' : `Create the first ${cfg.singular}.`}</p>
        </Empty>
      ) : null}
      {data && data.items.length ? (
        <div className="a-tablewrap">
          <table className="a-table">
            <thead>
              <tr>
                {cfg.thumb ? <th style={{ width: 64 }} aria-label="Photo" /> : null}
                {cfg.columns.map((c) => (
                  <th key={c.label} style={c.width ? { width: c.width } : undefined}>
                    {c.label}
                  </th>
                ))}
                {canReorder ? <th style={{ width: 90 }}>Order</th> : null}
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, i) => (
                <tr key={item.id} onClick={() => router.push(`/admin/${cfg.name}/${item.id}`)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && router.push(`/admin/${cfg.name}/${item.id}`)}>
                  {cfg.thumb ? <td>{cfg.thumb(item) ? <img className="a-thumb" src={thumb(cfg.thumb(item)!, 480)} alt="" /> : <span className="a-thumb a-thumb--empty" />}</td> : null}
                  {cfg.columns.map((c) => (
                    <td key={c.label}>{c.render(item)}</td>
                  ))}
                  {canReorder ? (
                    <td onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                      <button type="button" className="a-icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
                      <button type="button" className="a-icon-btn" disabled={i === data.items.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
                    </td>
                  ) : null}
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

/* ================================================================== editor */
export function EntityEditor({ cfg, id }: { cfg: EntityConfig; id: string }) {
  const isNew = id === 'new';
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const { data: item, loading } = useApi<any>(isNew ? null : `/${cfg.name}/${id}`);
  const { data: lookups } = useApi<{ sports: { id: string; name: string }[] }>('/lookups');
  const [form, setForm] = useState<Record<string, unknown>>(cfg.defaults);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  // Counts edits. A save only replaces the form with the server's copy if nothing
  // was typed while it was in flight; otherwise the newer typing is kept.
  const revision = useRef(0);
  const savingRef = useRef(false);

  useEffect(() => {
    if (item) setForm(cfg.toForm ? cfg.toForm(item) : item);
  }, [item, cfg]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = (key: string, v: unknown) => {
    revision.current++;
    setForm((f) => ({ ...f, [key]: v }));
    setDirty(true);
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  const save = useCallback(
    async (override?: Record<string, unknown>) => {
      if (savingRef.current) return; // ignore double clicks / repeated Ctrl+S
      savingRef.current = true;
      setSaving(true);
      setErrors({});
      const startedAt = revision.current;
      const payload = { ...form, ...override };
      try {
        const saved = await api<any>(isNew ? `/${cfg.name}` : `/${cfg.name}/${id}`, { method: isNew ? 'POST' : 'PUT', json: payload });
        toast(isNew ? `${cap(cfg.singular)} created` : 'Changes saved');
        if (isNew) {
          setDirty(false);
          router.replace(`/admin/${cfg.name}/${saved.id}`);
        } else if (revision.current === startedAt) {
          setForm(cfg.toForm ? cfg.toForm(saved) : saved);
          setDirty(false);
        } else {
          // Typed more while saving: keep it, but take server-made values (slug, dates).
          setForm((f) => ({ ...f, slug: saved.slug ?? f.slug, published_at: saved.published_at ?? f.published_at, status: saved.status ?? f.status }));
        }
      } catch (e) {
        const err = e as ApiError;
        setErrors(err.details ?? {});
        toast(err.message, 'error');
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [form, isNew, cfg, id, router, toast],
  );

  // Ctrl+S / Cmd+S saves, like any desktop editor.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  const remove = async () => {
    if (!(await confirm(`Delete this ${cfg.singular}? This can’t be undone.`))) return;
    try {
      await api(`/${cfg.name}/${id}`, { method: 'DELETE' });
      setDirty(false);
      toast(`${cap(cfg.singular)} deleted`);
      router.replace(`/admin/${cfg.name}`);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  if (!isNew && loading && !item) return <Loading />;
  const publicPath = item && cfg.publicPath?.(item);
  const isNews = cfg.name === 'news';

  return (
    <>
      <PageHeader
        title={isNew ? `New ${cfg.singular}` : String(form.title ?? form.name ?? cap(cfg.singular))}
        sub={<Link href={`/admin/${cfg.name}`}>← {cfg.title}</Link>}
        actions={
          <>
            {publicPath ? (
              <a className="a-btn a-btn--ghost" href={`${SITE}${publicPath}`} target="_blank" rel="noopener">
                View on site
              </a>
            ) : null}
            {isNews && form.status !== 'published' ? (
              <>
                <button type="button" className="a-btn a-btn--ghost" onClick={() => save()} disabled={saving}>
                  {saving ? 'Saving…' : 'Save draft'}
                </button>
                <button type="button" className="a-btn a-btn--primary" onClick={() => save({ status: 'published' })} disabled={saving}>
                  {saving ? 'Publishing…' : 'Publish'}
                </button>
              </>
            ) : (
              <button type="button" className="a-btn a-btn--primary" onClick={() => save()} disabled={saving}>
                {saving ? 'Saving…' : isNew ? `Create ${cfg.singular}` : 'Save changes'}
              </button>
            )}
          </>
        }
      />
      {dirty ? <p className="a-dirty">Unsaved changes · Ctrl+S to save</p> : null}
      <form
        className="a-form"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {cfg.fields.map((f) => (
          <FieldInput key={f.key} def={f} value={form[f.key]} error={errors[f.key]} onChange={(v) => set(f.key, v)} sports={lookups?.sports ?? []} />
        ))}
        <button type="submit" hidden />
      </form>
      {!isNew ? (
        <div className="a-danger-zone">
          <div>
            <h3>Delete this {cfg.singular}</h3>
            <p>It is removed from the public site straight away.</p>
          </div>
          <button type="button" className="a-btn a-btn--danger" onClick={remove}>
            Delete
          </button>
        </div>
      ) : null}
      {dialog}
    </>
  );
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

function FieldInput({ def, value, error, onChange, sports }: { def: FieldDef; value: unknown; error?: string; onChange: (v: unknown) => void; sports: { id: string; name: string }[] }) {
  const str = value === null || value === undefined ? '' : String(value);
  const common = { label: def.label, hint: def.hint, error, required: def.required, wide: def.wide || ['markdown', 'list', 'rules', 'gallery'].includes(def.type) };
  switch (def.type) {
    case 'textarea':
      return <Field {...common}><textarea className="a-input a-textarea" value={str} onChange={(e) => onChange(e.target.value)} rows={5} /></Field>;
    case 'markdown':
      return <Field {...common}><MarkdownInput value={str} onChange={onChange} /></Field>;
    case 'select': {
      const opts = def.options === 'sports' ? sports.map((s) => ({ value: s.id, label: s.name })) : def.options;
      return (
        <Field {...common}>
          <select className="a-input" value={str} onChange={(e) => onChange(e.target.value || null)}>
            {def.options === 'sports' || def.empty ? <option value="">{def.empty ?? '—'}</option> : null}
            {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
      );
    }
    case 'checkbox':
      return (
        <label className="a-check">
          <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
          <span>{def.label}</span>
        </label>
      );
    case 'datetime':
      return <Field {...common} hint={def.hint ?? 'Bhutan time'}><input className="a-input" type="datetime-local" value={toLocalInput(str)} onChange={(e) => onChange(fromLocalInput(e.target.value))} /></Field>;
    case 'number':
      return <Field {...common}><input className="a-input" type="number" value={str} onChange={(e) => onChange(Number(e.target.value))} /></Field>;
    case 'image':
      return <Field {...common}><ImageField value={(value as string) ?? null} onChange={onChange} /></Field>;
    case 'file':
      return <Field {...common}><FileField value={(value as string) ?? null} onChange={onChange} /></Field>;
    case 'gallery':
      return <Field {...common}><GalleryField value={(value as string[]) ?? []} onChange={onChange} /></Field>;
    case 'list':
      return <Field {...common}><ListInput item={def.item} value={(value as Record<string, unknown>[]) ?? []} onChange={onChange} addLabel={def.addLabel} max={def.max} /></Field>;
    case 'rules':
      return <Field {...common} hint="One article per block. Each line under the title becomes a numbered clause."><RulesInput value={(value as RuleSection[]) ?? []} onChange={onChange} /></Field>;
    default:
      return <Field {...common}><input className="a-input" type={def.type === 'email' ? 'email' : def.type === 'url' ? 'url' : 'text'} value={str} onChange={(e) => onChange(e.target.value)} /></Field>;
  }
}

/* ------------------------------------------------------------------ markdown with preview */
function MarkdownInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const blocks = useMemo(() => (tab === 'preview' ? parseMarkdown(value) : []), [tab, value]);
  return (
    <div className="a-md">
      <div className="a-seg a-seg--sm">
        <button type="button" aria-pressed={tab === 'write'} onClick={() => setTab('write')}>Write</button>
        <button type="button" aria-pressed={tab === 'preview'} onClick={() => setTab('preview')}>Preview</button>
      </div>
      {tab === 'write' ? (
        <>
          <textarea className="a-input a-textarea a-textarea--tall" value={value} onChange={(e) => onChange(e.target.value)} />
          <p className="a-field__hint">## Heading, **bold**, *italic*, [link text](https://…), and lines starting with - for lists.</p>
        </>
      ) : (
        <div className="a-md__preview">
          {blocks.length ? blocks.map((b, i) => <PreviewBlock key={i} b={b} />) : <p className="a-muted">Nothing to preview yet.</p>}
        </div>
      )}
    </div>
  );
}

function PreviewBlock({ b }: { b: ReturnType<typeof parseMarkdown>[number] }) {
  const txt = (nodes: any[]): string => nodes.map((n) => (n.t === 'text' ? n.v : n.t === 'br' ? '\n' : txt(n.c))).join('');
  if ('items' in b) {
    const L = b.t;
    return <L>{b.items.map((it, i) => <li key={i}>{txt(it)}</li>)}</L>;
  }
  const Tag = b.t === 'quote' ? 'blockquote' : b.t;
  return <Tag>{txt(b.c)}</Tag>;
}

/* ------------------------------------------------------------------ repeatable rows */
function ListInput({ item, value, onChange, addLabel, max }: { item: SubField[]; value: Record<string, unknown>[]; onChange: (v: unknown) => void; addLabel: string; max?: number }) {
  const update = (i: number, key: string, v: unknown) => onChange(value.map((row, j) => (j === i ? { ...row, [key]: v } : row)));
  const move = (i: number, d: number) => {
    const next = [...value];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    onChange(next);
  };
  return (
    <div className="a-list">
      {value.map((row, i) => (
        <div key={i} className="a-list__row" style={{ gridTemplateColumns: `${item.map((s) => `${s.width ?? 1}fr`).join(' ')} auto` }}>
          {item.map((s) => (
            <label key={s.key} className="a-list__cell">
              <span className="a-list__label">{s.label}</span>
              {s.type === 'textarea' ? (
                <textarea className="a-input a-textarea" rows={2} value={String(row[s.key] ?? '')} onChange={(e) => update(i, s.key, e.target.value)} />
              ) : s.type === 'image' ? (
                <ImageField value={(row[s.key] as string) ?? null} onChange={(v) => update(i, s.key, v)} />
              ) : (
                <input className="a-input" value={String(row[s.key] ?? '')} placeholder={s.placeholder} onChange={(e) => update(i, s.key, e.target.value)} />
              )}
            </label>
          ))}
          <div className="a-list__tools">
            <button type="button" className="a-icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
            <button type="button" className="a-icon-btn" disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
            <button type="button" className="a-icon-btn" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove">×</button>
          </div>
        </div>
      ))}
      {!max || value.length < max ? (
        <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => onChange([...value, {}])}>
          {addLabel}
        </button>
      ) : null}
    </div>
  );
}

function RulesInput({ value, onChange }: { value: RuleSection[]; onChange: (v: RuleSection[]) => void }) {
  const update = (i: number, patch: Partial<RuleSection>) => onChange(value.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  return (
    <div className="a-list">
      {value.map((sec, i) => (
        <details key={i} className="a-rule" open={!sec.title}>
          <summary>
            <span>{sec.title || 'New article'}</span>
            <span className="a-muted">{sec.items.length} clauses</span>
          </summary>
          <input className="a-input" placeholder="Article title, e.g. Article IX — Counting of points" value={sec.title} onChange={(e) => update(i, { title: e.target.value })} />
          <textarea
            className="a-input a-textarea a-textarea--tall"
            value={sec.items.join('\n')}
            onChange={(e) => update(i, { items: e.target.value.split('\n') })}
            onBlur={(e) => update(i, { items: e.target.value.split('\n').map((l) => l.trim()).filter(Boolean) })}
          />
          <div className="a-row a-row--end">
            <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => onChange(value.filter((_, j) => j !== i))}>
              Remove article
            </button>
          </div>
        </details>
      ))}
      <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => onChange([...value, { title: '', items: [] }])}>
        Add article
      </button>
    </div>
  );
}
