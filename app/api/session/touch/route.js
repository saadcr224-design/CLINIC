import { route, json } from '@/lib/http';

// Keeps a signed-in session alive while the user is active (the http helper refreshes it).
export const POST = route(async ({ session, user }) => {
  if (user) await session.save();
  return json({ ok: true, signedIn: !!user });
});
