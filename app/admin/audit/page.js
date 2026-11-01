import audit from '@/lib/audit';
import { permit } from '@/lib/adminGuard';
import Denied from '../Denied';

export const metadata = { title: 'Audit log' };

export default async function AuditLog() {
  const access = await permit('/admin/audit', 'audit:read');
  if (!access) return <Denied />;
  const integrity = audit.verify();
  const entries = audit.readEntries().slice(-300).reverse();
  audit.log(access.ctx, 'admin.audit.view');
  return (
    <>
      <div className="admin-head">
        <h1>Audit log</h1>
        <p className={`integrity ${integrity.ok ? 'ok' : 'bad'}`}>
          {integrity.ok ? `✔ Hash chain intact · ${integrity.total} entries` : `✖ Tampering detected at entry ${integrity.brokenAt} of ${integrity.total}`}
        </p>
      </div>
      <div className="table-wrap"><table className="table compact">
        <thead><tr><th>Time (UTC)</th><th>Actor</th><th>Role</th><th>Action</th><th>Target</th><th>IP</th><th>Hash</th></tr></thead>
        <tbody>{entries.map((e) => (
          <tr key={e.hash}><td>{e.ts.replace('T', ' ').slice(0, 19)}</td><td>{e.actor}</td><td>{e.role}</td><td><code>{e.action}</code></td><td>{e.target || ''}</td><td>{e.ip}</td><td><code title={e.hash}>{e.hash.slice(0, 10)}…</code></td></tr>
        ))}</tbody>
      </table></div>
      <p className="small muted">Showing the latest 300 entries. Ship the audit log to your SIEM for long-term retention.</p>
    </>
  );
}
