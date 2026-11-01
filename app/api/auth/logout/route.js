import { route, json } from '@/lib/http';
import audit from '@/lib/audit';

export const POST = route(async ({ session, ctx }) => {
  audit.log(ctx, 'auth.logout');
  session.destroy();
  return json({ ok: true });
});
