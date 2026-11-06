'use client';

import { useState } from 'react';
import { api, useApi, optimistic } from '@/admin/lib/api';
import { PageHeader, Loading, Empty, useToast, useConfirm } from '@/admin/components/ui';

interface Msg { id: string; name: string; email: string; phone: string | null; subject: string; message: string; is_read: boolean; created_at: string }

export default function MessagesPage() {
  const [unread, setUnread] = useState(false);
  const { data, error, mutate } = useApi<{ items: Msg[]; total: number }>(`/messages?pageSize=100${unread ? '&unread=1' : ''}`);
  const [openId, setOpenId] = useState<string | null>(null);
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const open = data?.items.find((m) => m.id === openId) ?? null;

  const setRead = (m: Msg, is_read: boolean) =>
    optimistic(
      () => mutate((d) => ({ ...d, items: d.items.map((x) => (x.id === m.id ? { ...x, is_read } : x)) })),
      () => api(`/messages/${m.id}`, { method: 'PATCH', json: { is_read } }),
      () => mutate((d) => ({ ...d, items: d.items.map((x) => (x.id === m.id ? { ...x, is_read: m.is_read } : x)) })),
      (msg) => toast(msg, 'error'),
    );

  // Opening a message shows it at once; marking it read happens in the background.
  const select = (m: Msg) => {
    setOpenId(m.id);
    if (!m.is_read) void setRead(m, true);
  };
  const remove = async (m: Msg) => {
    if (!(await confirm(`Delete the message from ${m.name}?`))) return;
    const ok = await optimistic(
      () => (setOpenId(null), mutate((d) => ({ ...d, total: d.total - 1, items: d.items.filter((x) => x.id !== m.id) }))),
      () => api(`/messages/${m.id}`, { method: 'DELETE' }),
      () => mutate((d) => ({ ...d, total: d.total + 1, items: [...d.items, m].sort((a, b) => b.created_at.localeCompare(a.created_at)) })),
      (msg) => toast(msg, 'error'),
    );
    if (ok) toast('Message deleted');
  };

  return (
    <>
      <PageHeader title="Messages" sub="Enquiries sent through the Contact us page." />
      <div className="a-seg" role="group" aria-label="Filter">
        <button type="button" aria-pressed={!unread} onClick={() => setUnread(false)}>All</button>
        <button type="button" aria-pressed={unread} onClick={() => setUnread(true)}>Unread</button>
      </div>
      {error && !data ? <p className="a-error">{error}</p> : null}
      {!data ? (error ? null : <Loading />) : !data.items.length ? <Empty title={unread ? 'All caught up' : 'No messages yet'}><p>{unread ? 'Every message has been read.' : 'Messages from the contact form appear here.'}</p></Empty> : (
        <div className="a-inbox">
          <ul className="a-inbox__list">
            {data.items.map((m) => (
              <li key={m.id}>
                <button type="button" className={`${m.id === openId ? 'is-open' : ''} ${m.is_read ? '' : 'is-unread'}`} onClick={() => select(m)}>
                  <strong>{m.name}</strong>
                  <span>{m.subject}</span>
                  <small>{new Date(m.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Thimphu', dateStyle: 'medium', timeStyle: 'short' })}</small>
                </button>
              </li>
            ))}
          </ul>
          <div className="a-inbox__view">
            {open ? (
              <article>
                <h2>{open.subject}</h2>
                <p className="a-muted">
                  {open.name}, <a href={`mailto:${open.email}`}>{open.email}</a>{open.phone ? <>, <a href={`tel:${open.phone}`}>{open.phone}</a></> : null}
                </p>
                <p className="a-message">{open.message}</p>
                <div className="a-row">
                  <a className="a-btn a-btn--primary" href={`mailto:${open.email}?subject=${encodeURIComponent('Re: ' + open.subject)}`}>Reply by email</a>
                  <button type="button" className="a-btn a-btn--ghost" onClick={() => void setRead(open, false)}>Mark unread</button>
                  <button type="button" className="a-btn a-btn--danger" onClick={() => remove(open)}>Delete</button>
                </div>
              </article>
            ) : (
              <p className="a-muted">Choose a message to read it.</p>
            )}
          </div>
        </div>
      )}
      {dialog}
    </>
  );
}
