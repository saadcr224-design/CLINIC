'use strict';
// Helpers for API route handlers: JSON parsing with a size limit, CSRF and rate-limit checks,
// and one place that turns unexpected errors into a generic 500 (no stack traces to clients).
const { getSession, activeUser, touch, clientIp } = require('./session');
const { checkCsrf, rateLimit } = require('./security');

const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const fail = (status, error, extra = {}) => json({ ok: false, error, ...extra }, status);

async function readJson(req, limit = 20 * 1024) {
  if (!(req.headers.get('content-type') || '').includes('application/json')) return null;
  const text = await req.text();
  if (text.length > limit) return null;
  try {
    const body = JSON.parse(text || '{}');
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

// opts.limit: [bucket, windowMinutes, maxRequests]; opts.csrf: false to skip (GET is never checked)
function route(fn, opts = {}) {
  return async (req, context) => {
    try {
      const session = await getSession();
      const ip = await clientIp();
      if (opts.limit && !rateLimit(`${opts.limit[0]}:${ip}`, opts.limit[1], opts.limit[2])) {
        return fail(429, 'Too many requests. Please wait a few minutes and try again.');
      }
      let body = {};
      if (req.method !== 'GET') {
        body = await readJson(req);
        if (!body) return fail(400, 'Invalid request body');
        if (opts.csrf !== false && !checkCsrf(session, req.headers.get('x-csrf-token'))) {
          return fail(403, 'Invalid or expired form token. Please reload the page.');
        }
      }
      const user = activeUser(session);
      if (user) touch(session);
      const params = context && context.params ? await context.params : {};
      return await fn({ req, session, body, ip, user, ctx: { user, ip }, params });
    } catch (err) {
      console.error(err);
      return fail(500, 'Server error');
    }
  };
}

module.exports = { route, json, fail, readJson };
