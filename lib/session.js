'use strict';
// Encrypted cookie sessions (iron-session). They hold only small values (CSRF token,
// CAPTCHA hash, signed-in user) and work across serverless instances without a store.
const { cookies, headers } = require('next/headers');
const { getIronSession } = require('iron-session');
const config = require('./config');

const sessionOptions = () => ({
  password: config.sessionSecret,
  cookieName: config.isProd ? '__Host-sid' : 'sid',
  ttl: 12 * 60 * 60,
  cookieOptions: { httpOnly: true, sameSite: 'lax', secure: config.isProd, path: '/' },
});

async function getSession() {
  return getIronSession(await cookies(), sessionOptions());
}

const minuteNow = () => Math.floor(Date.now() / 60000);

// The signed-in user, or null once SESSION_IDLE_MINUTES pass without activity.
function activeUser(session) {
  if (!session.user) return null;
  if (minuteNow() - (session.seen || 0) > config.sessionIdleMinutes) return null;
  return session.user;
}

function touch(session) {
  session.seen = minuteNow();
}

async function clientIp() {
  const h = await headers();
  return (h.get('x-forwarded-for') || '').split(',')[0].trim() || h.get('x-real-ip') || null;
}

module.exports = { getSession, activeUser, touch, clientIp, sessionOptions, minuteNow };
