import { route, json } from '@/lib/http';
import { ensureCsrf, newCaptcha } from '@/lib/security';

// Hands the browser its CSRF token (and, when asked, a fresh CAPTCHA question).
export const GET = route(async ({ req, session }) => {
  const had = session.csrf;
  const csrf = ensureCsrf(session);
  const wantCaptcha = new URL(req.url).searchParams.get('captcha') === '1';
  const captcha = wantCaptcha ? newCaptcha(session) : undefined;
  if (!had || wantCaptcha) await session.save();
  return json({ csrf, captcha });
}, { limit: ['token', 1, 60] });
