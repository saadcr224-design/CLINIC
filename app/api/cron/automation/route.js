import { json, fail } from '@/lib/http';
import automation from '@/lib/automation';

// Scheduled automation (reminders, review requests). Vercel Cron calls this with
// "Authorization: Bearer $CRON_SECRET".
export function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return fail(401, 'Unauthorized');
  return json({ ok: true, sent: automation.run() });
}
