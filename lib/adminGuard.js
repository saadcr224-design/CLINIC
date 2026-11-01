'use strict';
// Permission check for staff pages: returns the user context, or null (and logs) if not allowed.
const auth = require('./auth');
const audit = require('./audit');
const { requireUser } = require('./guard');

async function permit(path, ...perms) {
  const { user, ctx, forbidden } = await requireUser(['reception', 'doctor', 'admin'], path);
  if (forbidden) return null;
  if (!perms.some((p) => auth.can(user, p))) {
    audit.log(ctx, 'auth.denied', path);
    return null;
  }
  return { user, ctx };
}

module.exports = { permit };
