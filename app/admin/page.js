import content from '@/lib/content';
import store from '@/lib/store';
import auth from '@/lib/auth';
import audit from '@/lib/audit';
import { permit } from '@/lib/adminGuard';
import { StatusSelect, Reveal } from '@/components/AdminControls';
import { APPOINTMENT_STATUSES as STATUSES } from '@/lib/constants';
import Denied from './Denied';

export const metadata = { title: 'Appointments' };

export default async function AppointmentsAdmin({ searchParams }) {
  const access = await permit('/admin', 'appointments:read', 'appointments:read:own');
  if (!access) return <Denied />;
  const { user, ctx } = access;
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status) ? sp.status : '';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.date || '') ? sp.date : '';
  const own = !auth.can(user, 'appointments:read');
  const canEdit = auth.can(user, 'appointments:update');
  const rows = store
    .find('appointments', (a) => (!own || a.doctor === user.doctorSlug) && (!status || a.status === status) && (!date || a.date === date))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  audit.log(ctx, 'admin.appointments.list', null, { count: rows.length, scope: own ? 'own' : 'all' });

  return (
    <>
      <div className="admin-head">
        <h1>Appointments {own && <small className="muted">(your patients)</small>}</h1>
        <form className="admin-filters" method="get">
          <label>Date <input type="date" name="date" defaultValue={date} /></label>
          <label>Status
            <select name="status" defaultValue={status}><option value="">All</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
          </label>
          <button className="btn btn-primary btn-sm">Filter</button>
        </form>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Ref</th><th>Date / time</th><th>Doctor</th><th>Patient</th><th>Contact</th><th>ID</th><th>Insurance</th><th>Type</th><th>Status</th></tr></thead>
          <tbody>
            {!rows.length && <tr><td colSpan={9} className="muted">No appointments.</td></tr>}
            {rows.map((a) => (
              <tr key={a.id}>
                <td><code>{a.ref}</code></td>
                <td>{a.date} <strong>{a.time}</strong></td>
                <td>{content.doctor(a.doctor)?.name || a.doctor}</td>
                <td>{a.patient.name}{a.reason && <><br /><small className="muted">{a.reason}</small></>}</td>
                <td><a href={`tel:${a.patient.phone}`}>{a.patient.phone}</a><br /><small>{a.patient.email}</small></td>
                <td><Reveal value={a.patient.nationalId} /></td>
                <td>{a.insurance}</td>
                <td>{a.visitType}</td>
                <td>{canEdit ? <StatusSelect id={a.id} value={a.status} label={`Status for ${a.ref}`} /> : <span className={`status status-${a.status}`}>{a.status}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted">Every view of this page is recorded in the audit log. National ID numbers are masked; click to reveal.</p>
    </>
  );
}
