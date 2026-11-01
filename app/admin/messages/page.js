import store from '@/lib/store';
import audit from '@/lib/audit';
import { permit } from '@/lib/adminGuard';
import Denied from '../Denied';

export const metadata = { title: 'Inbox' };
const when = (iso) => iso.replace('T', ' ').slice(0, 16);

export default async function Inbox() {
  const access = await permit('/admin/messages', 'messages:read');
  if (!access) return <Denied />;
  const latest = (name) => store.all(name).slice().reverse();
  const ambulance = latest('ambulance');
  const messages = latest('messages');
  const reviews = latest('reviews');
  const applications = latest('applications');
  const subscribers = store.all('subscribers');
  audit.log(access.ctx, 'admin.messages.list');

  return (
    <>
      <h1>Inbox</h1>
      <h2>🚑 Ambulance requests ({ambulance.length})</h2>
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Received</th><th>Phone</th><th>Name</th><th>Location</th></tr></thead>
        <tbody>{ambulance.map((r) => (
          <tr key={r.id} className="row-urgent"><td>{when(r.createdAt)}</td><td><a href={`tel:${r.phone}`}>{r.phone}</a></td><td>{r.name}</td>
            <td>{r.location ? <a href={`https://maps.google.com/?q=${r.location.lat},${r.location.lng}`} target="_blank" rel="noopener">Open map</a> : '—'}</td></tr>
        ))}</tbody>
      </table></div>
      <h2>Contact messages ({messages.length})</h2>
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Received</th><th>From</th><th>Subject</th><th>Message</th></tr></thead>
        <tbody>{messages.map((m) => (
          <tr key={m.id}><td>{when(m.createdAt)}</td><td>{m.name}<br /><small>{m.email} {m.phone}</small></td><td>{m.subject}</td><td className="pre">{m.message}</td></tr>
        ))}</tbody>
      </table></div>
      <h2>Reviews awaiting moderation ({reviews.length})</h2>
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Received</th><th>Name</th><th>Rating</th><th>Review</th></tr></thead>
        <tbody>{reviews.map((r) => <tr key={r.id}><td>{r.createdAt.slice(0, 10)}</td><td>{r.name}</td><td>{r.rating}★</td><td className="pre">{r.text}</td></tr>)}</tbody>
      </table></div>
      <p className="small muted">Publish approved reviews by adding them to <code>content/testimonials.json</code> through the CMS.</p>
      <h2>Job applications ({applications.length})</h2>
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Received</th><th>Role</th><th>Name</th><th>Contact</th><th>CV</th></tr></thead>
        <tbody>{applications.map((a) => (
          <tr key={a.id}><td>{a.createdAt.slice(0, 10)}</td><td>{a.job}</td><td>{a.name}</td><td>{a.email}<br />{a.phone}</td><td><a href={a.cv} target="_blank" rel="noopener noreferrer">Open</a></td></tr>
        ))}</tbody>
      </table></div>
      <h2>Newsletter subscribers ({subscribers.length})</h2>
    </>
  );
}
