'use strict';
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

// ---------- CSRF (synchronizer token stored in the session) ----------
function csrf(req, res, next) {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
  res.locals.csrfToken = req.session.csrf;
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const sent = req.get('x-csrf-token') || (req.body && req.body._csrf) || '';
  const a = Buffer.from(String(sent));
  const b = Buffer.from(req.session.csrf);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(403).json({ ok: false, error: 'Invalid or expired form token. Please reload the page.' });
  }
  next();
}

// ---------- Simple arithmetic CAPTCHA + honeypot ----------
// Swap for hCaptcha / Cloudflare Turnstile in production by verifying their token here.
function newCaptcha(req) {
  const a = crypto.randomInt(1, 10);
  const b = crypto.randomInt(1, 10);
  req.session.captcha = String(a + b);
  return `${a} + ${b}`;
}

function checkBot(req) {
  const body = req.body || {};
  if (body.website) return 'bot'; // honeypot field, hidden from humans
  const expected = req.session.captcha;
  delete req.session.captcha; // single use
  if (!expected || String(body.captcha || '').trim() !== expected) return 'captcha';
  return null;
}

// ---------- Rate limiting ----------
const limiter = (windowMin, max) =>
  rateLimit({
    windowMs: windowMin * 60 * 1000,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { ok: false, error: 'Too many requests. Please wait a few minutes and try again.' },
  });

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

// schema: { field: { rule?, required?, max?, oneOf? } } -> { values, errors }
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

module.exports = { csrf, newCaptcha, checkBot, limiter, validate, rules, clean, mask };
