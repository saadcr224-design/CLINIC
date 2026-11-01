import Link from 'next/link';
import auth from '@/lib/auth';
import { requireUser } from '@/lib/guard';
import { KeepAlive, LogoutButton } from '@/components/Account';

export const metadata = { title: 'Staff console', robots: { index: false, follow: false } };

export default async function AdminLayout({ children }) {
  const { user, forbidden } = await requireUser(['reception', 'doctor', 'admin'], '/admin');
  const can = (perm) => auth.can(user, perm);
  return (
    <div className="admin">
      <KeepAlive />
      <header className="admin-bar">
        <div className="container admin-bar-inner">
          <Link className="logo logo-light" href="/admin"><img src="/img/logo.svg" alt="" width="32" height="32" /><span><strong>Staff console</strong></span></Link>
          {!forbidden && (
            <nav>
              <Link href="/admin">Appointments</Link>
              {can('messages:read') && <Link href="/admin/messages">Inbox</Link>}
              {can('audit:read') && <Link href="/admin/audit">Audit log</Link>}
              {(can('messages:read') || can('audit:read')) && <Link href="/admin/photos">Photos</Link>}
              <a href="/cms">Content (CMS)</a>
              <a href="/" target="_blank" rel="noopener">View site ↗</a>
            </nav>
          )}
          <div className="who-box"><span className="who">{user.name} · <em>{user.role}</em></span><LogoutButton className="btn btn-ghost btn-sm" /></div>
        </div>
      </header>
      <main id="main" className="admin-main container">
        {forbidden ? <><h1>Staff only</h1><p>This area is for clinic staff. <Link href="/portal">Go to the patient portal</Link>.</p></> : children}
      </main>
    </div>
  );
}
