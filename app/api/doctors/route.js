import { json } from '@/lib/http';
import content from '@/lib/content';

export function GET(req) {
  const dept = new URL(req.url).searchParams.get('dept') || '';
  return json(
    content
      .doctors()
      .filter((d) => !dept || d.department === dept)
      .map((d) => ({ slug: d.slug, name: d.name, title: d.title, department: d.department, days: d.days, photo: d.photo }))
  );
}
