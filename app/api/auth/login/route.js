import { route, json, fail } from '@/lib/http';
import auth from '@/lib/auth';
import audit from '@/lib/audit';
import config from '@/lib/config';
import { clean, safeNext } from '@/lib/security';
import { minuteNow } from '@/lib/session';
import crypto from 'crypto';

export const POST = route(async ({ session, body, ip }) => {
  if (config.demoAccounts) await auth.seedDemoUsers();
  const email = clean(body.email, 254);
  const user = await auth.verify(email, String(body.password || '').slice(0, 200));
  if (!user) {
    audit.log({ user: null, ip }, 'auth.failed', email);
    return fail(401, 'Invalid email or password.');
  }
  // Fresh session on login (new CSRF token) to prevent session fixation.
  for (const k of Object.keys(session)) if (typeof session[k] !== 'function') delete session[k];
  session.csrf = crypto.randomBytes(24).toString('hex');
  session.seen = minuteNow();
  session.user = { id: user.id, email: user.email, name: user.name, role: user.role, doctorSlug: user.doctorSlug };
  await session.save();
  audit.log({ user: session.user, ip }, 'auth.login', user.email);
  const redirect = user.role === 'patient' ? safeNext(body.next, '/portal') : '/admin';
  return json({ ok: true, redirect });
}, { limit: ['login', 15, 8] });
