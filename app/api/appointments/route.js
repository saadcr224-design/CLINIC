import { route, json } from '@/lib/http';
import forms from '@/lib/forms';

export const POST = route(async ({ session, body, ctx }) => {
  const [status, data] = forms.bookAppointment({ session, body, ctx });
  await session.save();
  return json(data, status);
}, { limit: ['appt', 15, 10] });
