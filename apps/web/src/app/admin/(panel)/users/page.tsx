'use client';

import { useState } from 'react';
import { formatDate } from '@bigsa/shared';
import { api, useApi, ApiError } from '@/admin/lib/api';
import { PageHeader, Loading, Field, Modal, useToast, useMe } from '@/admin/components/ui';

interface User { id: string; email: string; name: string; is_active: boolean; last_login_at: string | null; is_locked: boolean }

/**
 * The site has two kinds of people: guests (every visitor, no account) and
 * administrators. Every admin account has full access to the admin panel.
 */
export default function AdminAccountsPage() {
  const me = useMe()!;
  const { data, reload } = useApi<User[]>('/users');
  const [edit, setEdit] = useState<(Partial<User> & { password?: string }) | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const toast = useToast();

  const save = async () => {
    if (!edit) return;
    setErrors({});
    try {
      if (edit.id) await api(`/users/${edit.id}`, { method: 'PUT', json: { name: edit.name, is_active: edit.is_active, password: edit.password ?? '' } });
      else await api('/users', { method: 'POST', json: { email: edit.email, name: edit.name, password: edit.password } });
      toast(edit.id ? 'Account updated' : 'Admin added');
      setEdit(null);
      reload();
    } catch (e) {
      setErrors((e as ApiError).details ?? {});
      toast((e as Error).message, 'error');
    }
  };

  return (
    <>
      <PageHeader
        title="Admin accounts"
        sub="People who can sign in at /admin. Visitors to the website never need an account."
        actions={<button type="button" className="a-btn a-btn--primary" onClick={() => setEdit({ is_active: true })}>Add admin</button>}
      />
      {!data ? <Loading /> : (
        <div className="a-tablewrap">
          <table className="a-table">
            <thead><tr><th>Name</th><th style={{ width: 160 }}>Last sign-in</th><th style={{ width: 140 }}>Status</th></tr></thead>
            <tbody>
              {data.map((u) => (
                <tr key={u.id} onClick={() => setEdit({ ...u, password: '' })} tabIndex={0}>
                  <td><strong>{u.name}</strong>{u.id === me.id ? <span className="a-muted"> (you)</span> : null}<br /><span className="a-muted a-small">{u.email}</span></td>
                  <td>{u.last_login_at ? formatDate(u.last_login_at) : 'Never'}</td>
                  <td>{!u.is_active ? <span className="a-pill a-pill--neutral">Deactivated</span> : u.is_locked ? <span className="a-pill a-pill--bad">Locked</span> : <span className="a-pill a-pill--ok">Active</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {edit ? (
        <Modal title={edit.id ? `Edit ${edit.name}` : 'Add an admin'} onClose={() => setEdit(null)}>
          <div className="a-stack">
            <Field label="Full name" error={errors.name}><input className="a-input" value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            {!edit.id ? <Field label="Email" error={errors.email}><input className="a-input" type="email" value={edit.email ?? ''} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></Field> : <p className="a-muted">{edit.email}</p>}
            <Field label={edit.id ? 'Set a new password' : 'Temporary password'} hint="12+ characters with letters and a number. They can change it under Account." error={errors.password}>
              <input className="a-input" type="password" autoComplete="new-password" value={edit.password ?? ''} onChange={(e) => setEdit({ ...edit, password: e.target.value })} />
            </Field>
            {edit.id && edit.id !== me.id ? <label className="a-check"><input type="checkbox" checked={!!edit.is_active} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} /><span>Can sign in (untick to deactivate and sign them out everywhere)</span></label> : null}
            <div className="a-row a-row--end"><button type="button" className="a-btn a-btn--primary" onClick={save}>{edit.id ? 'Save' : 'Add admin'}</button></div>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
