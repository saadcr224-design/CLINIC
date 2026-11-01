import Link from 'next/link';
import content from '@/lib/content';
import store from '@/lib/store';
import auth from '@/lib/auth';
import audit from '@/lib/audit';
import { requireUser } from '@/lib/guard';
import { riyadhNow } from '@/lib/slots';
import { fmtDate } from '@/lib/text';
import { Icon } from '@/components/Icons';
import PageHero from '@/components/PageHero';
import { LogoutButton, KeepAlive } from '@/components/Account';

export const metadata = { title: 'Patient portal', robots: { index: false } };

export default async function PortalPage() {
  const { user, forbidden, ctx } = await requireUser(['patient'], '/portal');
  const site = content.site();
  if (forbidden) {
    return (
      <>
        <PageHero heading="Patient portal" image={site.images.portal} />
        <section className="section"><div className="container narrow center"><p className="lead-dark">You are signed in as staff.</p><Link className="btn btn-primary" href="/admin">Go to the staff console</Link></div></section>
      </>
    );
  }
  const profile = auth.findByEmail(user.email);
  const today = riyadhNow().date;
  const appointments = store
    .find('appointments', (a) => a.patient.email === user.email && a.date >= today && a.status !== 'cancelled')
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  audit.log(ctx, 'portal.view', profile?.patient?.mrn);
  const p = profile?.patient;

  return (
    <>
      <KeepAlive />
      <PageHero heading="Patient portal" lead="View your appointments, lab reports and prescriptions securely." image={site.images.portal} />
      <section className="section portal">
        <div className="container">
          <div className="portal-head">
            <div>
              <p className="muted">Welcome back</p>
              <h2 className="portal-name">{user.name}</h2>
              {p && <p className="portal-ids"><span>MRN <strong>{p.mrn}</strong></span><span>Date of birth <strong>{p.dob}</strong></span><span>Blood type <strong>{p.bloodType}</strong></span></p>}
            </div>
            <LogoutButton />
          </div>
          <div className="portal-grid">
            <section className="card">
              <h2><Icon name="calendar" />Upcoming appointments</h2>
              {!appointments.length && <p className="muted">No upcoming appointments.</p>}
              <ul className="appt-list">
                {appointments.map((a) => (
                  <li key={a.id}>
                    <div><strong>{content.doctor(a.doctor)?.name || a.doctor}</strong><span>{fmtDate(a.date)} · {a.time}</span></div>
                    <span className={`status status-${a.status}`}>{a.status}</span>
                  </li>
                ))}
              </ul>
              <Link className="btn btn-primary" href="/book">Book Appointment</Link>
            </section>
            {p && (
              <>
                <section className="card">
                  <h2><Icon name="heart" />Lab reports</h2>
                  <table className="table"><tbody>{p.reports.map((r) => <tr key={r.name + r.date}><td>{r.date}</td><td>{r.name}</td><td>{r.status}</td></tr>)}</tbody></table>
                </section>
                <section className="card">
                  <h2><Icon name="card" />Prescriptions</h2>
                  <table className="table"><tbody>{p.prescriptions.map((x) => <tr key={x.drug}><td>{x.date}</td><td><strong>{x.drug}</strong><br /><small>{x.dose}</small></td><td>{x.doctor}</td></tr>)}</tbody></table>
                </section>
              </>
            )}
          </div>
          <p className="small muted"><Icon name="lock" />Protected by encryption, session timeout and audit logging.</p>
        </div>
      </section>
    </>
  );
}
