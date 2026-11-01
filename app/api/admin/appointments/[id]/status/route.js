import { route, json, fail } from '@/lib/http';
import auth from '@/lib/auth';
import audit from '@/lib/audit';
import store from '@/lib/store';
import { APPOINTMENT_STATUSES as STATUSES } from '@/lib/constants';

export const POST = route(async ({ session, body, params, user, ctx }) => {
  if (!auth.can(user, 'appointments:update')) {
    audit.log(ctx, 'auth.denied', `appointment status ${params.id}`);
    return fail(403, 'Forbidden');
  }
  if (!STATUSES.includes(body.status)) return fail(400, 'Bad status');
  const row = store.update('appointments', params.id, { status: body.status });
  if (!row) return fail(404, 'Not found');
  audit.log(ctx, 'admin.appointments.status', row.ref, { status: body.status });
  await session.save();
  return json({ ok: true });
});
