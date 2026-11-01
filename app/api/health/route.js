import { json } from '@/lib/http';
import { riyadhNow } from '@/lib/slots';

export function GET() {
  return json({ ok: true, time: riyadhNow() });
}
