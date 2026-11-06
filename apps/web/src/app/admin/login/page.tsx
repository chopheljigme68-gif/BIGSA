'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/admin/lib/api';

/** Where to go after signing in: only admin pages, never another site. */
function destination() {
  const next = new URLSearchParams(window.location.search).get('next');
  return next && next.startsWith('/admin') && !next.startsWith('/admin/login') ? next : '/admin';
}

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in with a valid session? Skip the form. (An invalid cookie gets a
  // 401, the API deletes it, and the form simply stays on screen.)
  useEffect(() => {
    api('/auth/me')
      .then(() => window.location.replace(destination()))
      .catch(() => undefined);
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await api('/auth/login', { method: 'POST', json: { email: fd.get('email'), password: fd.get('password') } });
      window.location.href = destination();
    } catch (err) {
      setError((err as ApiError).message);
      setBusy(false);
    }
  }

  return (
    <main className="a-login">
      <form className="a-login__card" onSubmit={onSubmit}>
        <img src="/brand/bigsa-logo.png" alt="BIGSA" width={72} height={68} />
        <h1>Sign in to BIGSA Admin</h1>
        <p className="a-muted">For authorised BIGSA personnel only.</p>
        {error ? <p className="a-alert" role="alert">{error}</p> : null}
        <label className="a-field">
          <span className="a-field__label">Email</span>
          <input className="a-input" name="email" type="email" autoComplete="username" required autoFocus />
        </label>
        <label className="a-field">
          <span className="a-field__label">Password</span>
          <input className="a-input" name="password" type="password" autoComplete="current-password" required />
        </label>
        <button type="submit" className="a-btn a-btn--primary a-btn--block" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="a-muted a-small">Forgotten your password? Ask a super admin to reset it from Users & roles.</p>
      </form>
    </main>
  );
}
