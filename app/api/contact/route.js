import { route, json } from '@/lib/http';
import forms from '@/lib/forms';

export const POST = route(async ({ session, body, ctx }) => {
  const [status, data] = forms.contactMessage({ session, body, ctx });
  await session.save();
  return json(data, status);
}, { limit: ['form', 15, 10] });
