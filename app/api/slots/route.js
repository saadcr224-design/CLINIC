import { route, json, fail } from '@/lib/http';
import content from '@/lib/content';
import { availableSlots } from '@/lib/slots';

export const GET = route(async ({ req }) => {
  const q = new URL(req.url).searchParams;
  const date = q.get('date') || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(400, 'Invalid date');
  const slug = q.get('doctor') || '';
  const dept = q.get('dept') || '';
  const doctors = slug ? [content.doctor(slug)].filter(Boolean) : content.doctors().filter((d) => !dept || d.department === dept);
  const result = doctors.map((d) => ({ doctor: d.slug, name: d.name, slots: availableSlots(d, date) })).filter((d) => d.slots.length);
  return json({ ok: true, date, doctors: result });
}, { limit: ['slots', 1, 60] });
