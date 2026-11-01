'use strict';
const crypto = require('crypto');
const config = require('./config');

// ---------- CSRF (synchronizer token kept in the encrypted session cookie) ----------
function ensureCsrf(session) {
  if (!session.csrf) session.csrf = crypto.randomBytes(24).toString('hex');
  return session.csrf;
}

function checkCsrf(session, sent) {
  const a = Buffer.from(String(sent || ''));
  const b = Buffer.from(String(session.csrf || ''));
  return b.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---------- Simple arithmetic CAPTCHA + honeypot ----------
// Swap for Cloudflare Turnstile / hCaptcha in production by verifying their token in checkBot.
const captchaHash = (answer, nonce) => crypto.createHmac('sha256', config.sessionSecret).update(`${nonce}:${answer}`).digest('base64url');

function newCaptcha(session) {
  const a = crypto.randomInt(1, 10);
  const b = crypto.randomInt(1, 10);
  const nonce = crypto.randomBytes(8).toString('hex');
  session.captcha = { nonce, hash: captchaHash(a + b, nonce) };
  return `${a} + ${b}`;
}

function checkBot(session, body) {
  if (body.website) return 'bot'; // honeypot field, hidden from humans
  const expected = session.captcha;
  delete session.captcha; // single use
  if (!expected || !expected.nonce || captchaHash(String(body.captcha || '').trim(), expected.nonce) !== expected.hash) return 'captcha';
  return null;
}

// ---------- Rate limiting (fixed window, per instance) ----------
// Good enough for a single server or a few serverless instances; use a shared store
// (e.g. Upstash Redis) or your WAF's rate limiting for stronger guarantees.
const buckets = new Map();
function rateLimit(key, windowMin, max) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMin * 60000 });
    if (buckets.size > 10000) for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
    return true;
  }
  b.count++;
  return b.count <= max;
}

// ---------- Input validation ----------
const clean = (v, max = 200) =>
  String(v ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);

const rules = {
  name: (v) => /^[\p{L}\p{M}' .-]{2,80}$/u.test(v),
  phone: (v) => /^\+?[0-9 ()-]{8,18}$/.test(v) && v.replace(/\D/g, '').length >= 9,
  email: (v) => /^[^\s@<>]{1,64}@[^\s@<>]{1,190}\.[A-Za-z]{2,24}$/.test(v),
  date: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)),
  time: (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v),
  nationalId: (v) => /^[12]\d{9}$/.test(v), // Saudi ID starts with 1, Iqama with 2
  slug: (v) => /^[a-z0-9-]{1,80}$/.test(v),
  url: (v) => /^https:\/\/[^\s<>"']{4,300}$/.test(v),
};

// schema: { field: { rule?, required?, max?, oneOf? } } -> { values, errors, ok }
function validate(body, schema) {
  const values = {};
  const errors = {};
  for (const [field, spec] of Object.entries(schema)) {
    const v = clean(body[field], spec.max || 200);
    if (!v) {
      if (spec.required) errors[field] = 'required';
      values[field] = '';
      continue;
    }
    if (spec.rule && !rules[spec.rule](v)) errors[field] = 'invalid';
    if (spec.oneOf && !spec.oneOf.includes(v)) errors[field] = 'invalid';
    values[field] = v;
  }
  return { values, errors, ok: Object.keys(errors).length === 0 };
}

const mask = (s, keep = 3) => (s ? '•'.repeat(Math.max(0, s.length - keep)) + s.slice(-keep) : '');

// Only allow redirecting to local paths after login (prevents open redirects).
const safeNext = (n, fallback) => (typeof n === 'string' && /^\/(?!\/)[\w\-/?=&.%]*$/.test(n) ? n : fallback);

module.exports = { ensureCsrf, checkCsrf, newCaptcha, checkBot, rateLimit, validate, rules, clean, mask, safeNext };
