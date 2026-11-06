'use client';

import { useState } from 'react';
import { useApi } from '@/admin/lib/api';
import { PageHeader, Loading } from '@/admin/components/ui';

interface Entry { id: number; actor_name: string | null; action: string; entity: string | null; entity_id: string | null; detail: Record<string, unknown> | null; created_at: string }

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const { data } = useApi<{ items: Entry[]; total: number; pageSize: number }>(`/audit?page=${page}`);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  return (
    <>
      <PageHeader title="Audit log" sub="Every sign-in, change, export and file download in the admin panel." />
      {!data ? <Loading /> : (
        <div className="a-tablewrap">
          <table className="a-table a-table--compact">
            <thead><tr><th style={{ width: 180 }}>When</th><th style={{ width: 180 }}>Who</th><th>What</th><th>Details</th></tr></thead>
            <tbody>
              {data.items.map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Thimphu', dateStyle: 'medium', timeStyle: 'medium' })}</td>
                  <td>{e.actor_name ?? 'System'}</td>
                  <td><code>{e.action}</code></td>
                  <td className="a-small a-muted">{e.detail ? Object.entries(e.detail).map(([k, v]) => `${k}: ${String(v)}`).join(', ') : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 ? (
        <div className="a-pager">
          <button type="button" className="a-btn a-btn--ghost a-btn--sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Newer</button>
          <span>Page {page} of {pages}</span>
          <button type="button" className="a-btn a-btn--ghost a-btn--sm" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>Older</button>
        </div>
      ) : null}
    </>
  );
}
