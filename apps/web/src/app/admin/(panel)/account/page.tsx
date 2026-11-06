'use client';

import { useState } from 'react';
import { api, ApiError } from '@/admin/lib/api';
import { PageHeader, Field, useMe, useToast } from '@/admin/components/ui';

export default function AccountPage() {
  const me = useMe()!;
  const toast = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (fd.get('next') !== fd.get('confirm')) return setErrors({ confirm: 'The two new passwords don’t match.' });
    setBusy(true);
    setErrors({});
    try {
      await api('/auth/password', { method: 'POST', json: { current: fd.get('current'), next: fd.get('next') } });
      toast('Password changed. Other sessions have been signed out.');
      form.reset();
    } catch (err) {
      setErrors((err as ApiError).details ?? {});
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Your account" sub={me.email} />
      <form className="a-card a-stack a-narrow" onSubmit={onSubmit}>
        <h2 className="a-card__title">Change password</h2>
        <Field label="Current password" error={errors.current}><input className="a-input" name="current" type="password" autoComplete="current-password" required /></Field>
        <Field label="New password" hint="At least 12 characters, with letters and a number." error={errors.next}><input className="a-input" name="next" type="password" autoComplete="new-password" required /></Field>
        <Field label="New password again" error={errors.confirm}><input className="a-input" name="confirm" type="password" autoComplete="new-password" required /></Field>
        <div><button type="submit" className="a-btn a-btn--primary" disabled={busy}>Change password</button></div>
      </form>
    </>
  );
}
