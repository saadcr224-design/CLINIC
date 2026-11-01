'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { postJSON } from './formToken';

export function LoginForm({ next }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const f = e.currentTarget;
    try {
      const { body } = await postJSON('/api/auth/login', { email: f.email.value, password: f.password.value, next });
      if (body.ok) window.location.assign(body.redirect); // full reload picks up the new session
      else setError(body.error || 'Sign-in failed.');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      {error && <p className="alert" role="alert">{error}</p>}
      <div className="field"><label htmlFor="p-email">Email</label><input id="p-email" name="email" type="email" required autoComplete="username" /></div>
      <div className="field"><label htmlFor="p-pass">Password</label><input id="p-pass" name="password" type="password" required autoComplete="current-password" /></div>
      <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in securely'}</button>
    </form>
  );
}

export function LogoutButton({ className = 'btn btn-outline' }) {
  return (
    <button type="button" className={className} onClick={async () => { await postJSON('/api/auth/logout', {}); window.location.assign('/'); }}>
      Sign out
    </button>
  );
}

// Refreshes the session on every page view so the idle timeout only signs out inactive users.
export function KeepAlive() {
  const pathname = usePathname();
  useEffect(() => { postJSON('/api/session/touch', {}).catch(() => {}); }, [pathname]);
  return null;
}
