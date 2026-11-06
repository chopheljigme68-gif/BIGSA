'use client';

import { useRef, useState } from 'react';
import { formatBytes } from '@bigsa/shared';
import { api, useApi, useDebounced, upload } from '@/admin/lib/api';
import { Modal, Loading, useToast } from './ui';

export interface MediaItem { id: string; filename: string; mime: string; size: number; width: number | null; height: number | null; alt: string | null; caption?: string | null; credit?: string | null; in_gallery?: boolean }

export const thumb = (id: string, w = 480) => `/media/${id}?w=${w}`;

/** Library browser with upload. Single or multiple selection. */
export function MediaPicker({ kind = 'image', multiple = false, onPick, onClose }: { kind?: 'image' | 'document'; multiple?: boolean; onPick: (items: MediaItem[]) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<MediaItem[]>([]);
  const query = useDebounced(q.trim(), 250);
  const { data, loading, error, mutate } = useApi<{ items: MediaItem[] }>(`/media?kind=${kind}&pageSize=120${query ? `&q=${encodeURIComponent(query)}` : ''}`);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const doUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const stored = await upload(Array.from(files));
      toast(`Uploaded ${stored.length} file${stored.length > 1 ? 's' : ''}`);
      // New files appear first, straight from the upload response.
      mutate((d) => ({ ...d, items: [...stored.map((s) => ({ ...s, alt: null })), ...d.items] }));
      if (!multiple && stored[0]) {
        onPick([{ ...stored[0], alt: null }]);
        onClose();
      }
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggle = (m: MediaItem) => {
    if (!multiple) {
      onPick([m]);
      onClose();
      return;
    }
    setSelected((s) => (s.some((x) => x.id === m.id) ? s.filter((x) => x.id !== m.id) : [...s, m]));
  };

  return (
    <Modal title={kind === 'image' ? 'Choose photos' : 'Choose a document'} onClose={onClose} wide>
      <div className="a-row">
        <input className="a-input" type="search" placeholder="Search by file name or description" value={q} onChange={(e) => setQ(e.target.value)} />
        <input ref={input} type="file" hidden multiple accept={kind === 'image' ? 'image/jpeg,image/png,image/webp' : '.pdf,.doc,.docx,.xlsx'} onChange={(e) => doUpload(e.target.files)} />
        <button type="button" className="a-btn a-btn--primary" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? 'Uploading…' : 'Upload new'}
        </button>
      </div>
      {error && !data ? <p className="a-error">{error}</p> : null}
      {loading && !data ? <Loading /> : null}
      <ul className={kind === 'image' ? 'a-mediagrid' : 'a-doclist'}>
        {data?.items.map((m) => {
          const on = selected.some((x) => x.id === m.id);
          return (
            <li key={m.id}>
              <button type="button" className={`a-mediapick ${on ? 'is-on' : ''}`} onClick={() => toggle(m)} aria-pressed={on}>
                {m.mime.startsWith('image/') ? <img src={thumb(m.id)} alt={m.alt ?? ''} loading="lazy" /> : <span className="a-fileicon">{m.filename.split('.').pop()?.toUpperCase()}</span>}
                <span className="a-mediapick__name">{m.filename}</span>
                <span className="a-mediapick__meta">{formatBytes(m.size)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {multiple ? (
        <div className="a-row a-row--end a-sticky-foot">
          <span className="a-muted">{selected.length} selected</span>
          <button type="button" className="a-btn a-btn--primary" disabled={!selected.length} onClick={() => (onPick(selected), onClose())}>
            Add selected
          </button>
        </div>
      ) : null}
    </Modal>
  );
}

/** Single image field. */
export function ImageField({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="a-imagefield">
      {value ? <img src={thumb(value)} alt="" /> : <span className="a-imagefield__empty">No photo</span>}
      <div className="a-row">
        <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => setOpen(true)}>
          {value ? 'Change' : 'Choose photo'}
        </button>
        {value ? (
          <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => onChange(null)}>
            Remove
          </button>
        ) : null}
      </div>
      {open ? <MediaPicker onPick={(m) => onChange(m[0]?.id ?? null)} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

/** Document field: upload directly or pick from the library. */
export function FileField({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState<string | null>(null);
  return (
    <div className="a-filefield">
      <span className="a-filefield__name">{value ? name ?? 'File attached' : 'No file yet'}</span>
      {value ? (
        <a className="a-btn a-btn--ghost a-btn--sm" href={`/media/${value}`} target="_blank" rel="noopener">
          Open
        </a>
      ) : null}
      <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => setOpen(true)}>
        {value ? 'Replace' : 'Upload or choose'}
      </button>
      {open ? (
        <MediaPicker
          kind="document"
          onPick={(m) => {
            onChange(m[0]?.id ?? null);
            setName(m[0]?.filename ?? null);
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

/** Ordered photo album. */
export function GalleryField({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const move = (i: number, d: number) => {
    const next = [...value];
    const [x] = next.splice(i, 1);
    next.splice(Math.max(0, Math.min(next.length, i + d)), 0, x);
    onChange(next);
  };
  return (
    <div>
      <ul className="a-gallery">
        {value.map((id, i) => (
          <li key={id}>
            <img src={thumb(id)} alt="" />
            <div className="a-gallery__tools">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move earlier">←</button>
              <button type="button" onClick={() => onChange(value.filter((v) => v !== id))} aria-label="Remove photo">×</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label="Move later">→</button>
            </div>
          </li>
        ))}
        <li>
          <button type="button" className="a-gallery__add" onClick={() => setOpen(true)}>
            Add photos
          </button>
        </li>
      </ul>
      {open ? <MediaPicker multiple onPick={(m) => onChange([...value, ...m.map((x) => x.id).filter((id) => !value.includes(id))])} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

export async function saveMediaMeta(id: string, patch: Partial<MediaItem>) {
  return api<MediaItem>(`/media/${id}`, { method: 'PUT', json: patch });
}
