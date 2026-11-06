'use client';

import { useRef, useState } from 'react';
import { formatBytes } from '@bigsa/shared';
import { api, useApi, useDebounced, optimistic, upload } from '@/admin/lib/api';
import { PageHeader, Loading, Empty, Field, Modal, useToast, useConfirm } from '@/admin/components/ui';
import { thumb, type MediaItem } from '@/admin/components/MediaPicker';

export default function MediaPage() {
  const [kind, setKind] = useState<'image' | 'document' | ''>('');
  const [gallery, setGallery] = useState(false);
  const [q, setQ] = useState('');
  const query = useDebounced(q.trim(), 250);
  const { data, error, loading, reload, mutate } = useApi<{ items: (MediaItem & { created_at: string })[]; total: number }>(
    `/media?pageSize=200${kind ? `&kind=${kind}` : ''}${gallery ? '&gallery=1' : ''}${query ? `&q=${encodeURIComponent(query)}` : ''}`,
  );
  const [edit, setEdit] = useState<MediaItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const doUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const res = await upload(Array.from(files));
      toast(`Uploaded ${res.length} file${res.length > 1 ? 's' : ''}`);
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!edit || saving) return;
    setSaving(true);
    try {
      const saved = await api<MediaItem>(`/media/${edit.id}`, {
        method: 'PUT',
        json: { alt: edit.alt, caption: edit.caption ?? null, credit: edit.credit ?? null, in_gallery: edit.in_gallery },
      });
      // Update the tile in place; no reload of the whole library.
      mutate((d) => ({ ...d, items: d.items.map((m) => (m.id === saved.id ? { ...m, ...saved } : m)) }));
      toast('Saved');
      setEdit(null);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    const target = edit;
    if (!target || !(await confirm(`Delete ${target.filename}? Anything using it will lose the file.`))) return;
    const before = data;
    const ok = await optimistic(
      () => (setEdit(null), mutate((d) => ({ ...d, total: d.total - 1, items: d.items.filter((m) => m.id !== target.id) }))),
      () => api(`/media/${target.id}`, { method: 'DELETE' }),
      () => mutate(() => before!),
      (msg) => toast(msg, 'error'),
    );
    if (ok) toast('File deleted');
  };

  return (
    <>
      <PageHeader
        title="Media library"
        sub="Photos and documents. Photos are resized automatically for fast loading and their location data is removed."
        actions={
          <>
            <input ref={input} type="file" hidden multiple accept="image/jpeg,image/png,image/webp,.pdf,.doc,.docx,.xlsx" onChange={(e) => doUpload(e.target.files)} />
            <button type="button" className="a-btn a-btn--primary" onClick={() => input.current?.click()} disabled={busy}>{busy ? 'Uploading…' : 'Upload files'}</button>
          </>
        }
      />
      <div className="a-toolbar">
        <input className="a-input a-input--search" type="search" placeholder="Search files" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="a-seg">
          {([['', 'Everything'], ['image', 'Photos'], ['document', 'Documents']] as const).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>{l}</button>
          ))}
        </div>
        <label className="a-inline"><input type="checkbox" checked={gallery} onChange={(e) => setGallery(e.target.checked)} /> In home-page gallery</label>
      </div>
      {error && !data ? <p className="a-error">{error}</p> : null}
      {loading && data ? <p className="a-muted a-small" aria-live="polite">Updating…</p> : null}
      {!data ? (error ? null : <Loading />) : !data.items.length ? <Empty title="No files"><p>Upload photos and documents to use across the site.</p></Empty> : (
        <ul className="a-mediagrid a-mediagrid--lg">
          {data.items.map((m) => (
            <li key={m.id}>
              <button type="button" className="a-mediapick" onClick={() => setEdit(m)}>
                {m.mime.startsWith('image/') ? <img src={thumb(m.id)} alt={m.alt ?? ''} loading="lazy" /> : <span className="a-fileicon">{m.filename.split('.').pop()?.toUpperCase()}</span>}
                <span className="a-mediapick__name">{m.filename}</span>
                <span className="a-mediapick__meta">{formatBytes(m.size)}{m.in_gallery ? ', in gallery' : ''}{m.mime.startsWith('image/') && !m.alt ? ', no description' : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {edit ? (
        <Modal title={edit.filename} onClose={() => setEdit(null)} wide>
          <div className="a-split a-split--even">
            <div>{edit.mime.startsWith('image/') ? <img className="a-preview" src={thumb(edit.id, 960)} alt="" /> : <a className="a-btn a-btn--ghost" href={`/media/${edit.id}`} target="_blank" rel="noopener">Open document</a>}</div>
            <div className="a-stack">
              <Field label="Description for screen readers" hint="Say what the photo shows, e.g. “Archers performing Dachham after a karey”."><textarea className="a-input a-textarea" rows={3} value={edit.alt ?? ''} onChange={(e) => setEdit({ ...edit, alt: e.target.value })} /></Field>
              <Field label="Caption"><input className="a-input" value={edit.caption ?? ''} onChange={(e) => setEdit({ ...edit, caption: e.target.value })} /></Field>
              <Field label="Photo credit"><input className="a-input" value={edit.credit ?? ''} onChange={(e) => setEdit({ ...edit, credit: e.target.value })} /></Field>
              {edit.mime.startsWith('image/') ? <label className="a-check"><input type="checkbox" checked={!!edit.in_gallery} onChange={(e) => setEdit({ ...edit, in_gallery: e.target.checked })} /><span>Show in the home-page photo gallery</span></label> : null}
              <p className="a-muted a-small">{edit.width && edit.height ? `${edit.width} × ${edit.height}px, ` : ''}{formatBytes(edit.size)}</p>
              <div className="a-row">
                <button type="button" className="a-btn a-btn--primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                <button type="button" className="a-btn a-btn--danger" onClick={remove}>Delete file</button>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}
      {dialog}
    </>
  );
}
