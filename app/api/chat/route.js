import { route, json, fail } from '@/lib/http';
import { clean } from '@/lib/security';
import chatbot from '@/lib/chatbot';

export const POST = route(async ({ body }) => {
  const text = clean(body.message, 300);
  if (!text) return fail(400, 'Empty message');
  return json({ ok: true, ...chatbot.reply(text) });
}, { limit: ['chat', 1, 20] });
