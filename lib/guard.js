'use strict';
// Access checks for server-rendered pages: redirect to sign-in, or report "forbidden".
const { redirect } = require('next/navigation');
const { getSession, activeUser, clientIp } = require('./session');
const audit = require('./audit');

async function requireUser(roles, returnTo) {
  const session = await getSession();
  const user = activeUser(session);
  if (!user) redirect(`/portal/login?next=${encodeURIComponent(returnTo)}`);
  const ctx = { user, ip: await clientIp() };
  if (roles && !roles.includes(user.role)) {
    audit.log(ctx, 'auth.denied', returnTo);
    return { forbidden: true, user, ctx };
  }
  return { user, ctx };
}

module.exports = { requireUser };
