import { Icon } from '@/components/Icons';
import PageHero from '@/components/PageHero';
import { LoginForm } from '@/components/Account';
import content from '@/lib/content';
import auth from '@/lib/auth';
import config from '@/lib/config';
import { safeNext } from '@/lib/security';

export const metadata = { title: 'Patient portal sign-in', robots: { index: false } };

export default async function LoginPage({ searchParams }) {
  const next = safeNext((await searchParams).next, '/portal');
  return (
    <>
      <PageHero heading="Patient portal" lead="View your appointments, lab reports and prescriptions securely." image={content.site().images.portal} />
      <section className="section auth-section">
        <div className="container auth-grid">
          <div className="card auth-card">
            <span className="feature-icon"><Icon name="lock" /></span>
            <h2>Sign in</h2>
            <LoginForm next={next} />
            <p className="small muted"><Icon name="shield" />Protected by encryption, session timeout and audit logging.</p>
          </div>
          {config.demoAccounts && (
            <aside className="card demo-card">
              <h2>Demo accounts</h2>
              <p className="small muted">Shown because demo accounts are enabled (development, or DEMO_ACCOUNTS=true). Turn them off before real patients use the site.</p>
              <div className="table-wrap"><table className="table compact">
                <thead><tr><th>Role</th><th>Email</th><th>Password</th></tr></thead>
                <tbody>{auth.DEMO_USERS.map((u) => <tr key={u.email}><td>{u.role}</td><td><code>{u.email}</code></td><td><code>{u.password}</code></td></tr>)}</tbody>
              </table></div>
            </aside>
          )}
        </div>
      </section>
    </>
  );
}
