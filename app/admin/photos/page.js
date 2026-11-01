import content from '@/lib/content';
import { permit } from '@/lib/adminGuard';
import { PhotoGrid } from '@/components/AdminControls';
import Denied from '../Denied';

export const metadata = { title: 'Photo check' };

// Every photo the site uses, so staff can check each one loads and shows the right subject.
export default async function Photos() {
  const access = await permit('/admin/photos', 'messages:read', 'audit:read');
  if (!access) return <Denied />;
  const site = content.site();
  const photos = [
    ...Object.entries(site.images).map(([k, src]) => ({ src, where: `Site · ${k}` })),
    ...content.departments().map((d) => ({ src: d.image, where: `Department · ${d.name}` })),
    ...content.doctors().map((d) => ({ src: d.photo, where: `Doctor · ${d.name}` })),
    ...content.posts().map((p) => ({ src: p.image, where: `Article · ${p.title}` })),
    ...site.fallbackImages.map((src, i) => ({ src, where: `Backup photo ${i + 1}` })),
    ...site.fallbackPortraits.map((src, i) => ({ src, where: `Backup portrait ${i + 1}` })),
  ];
  return (
    <>
      <div className="admin-head"><h1>Photo check</h1></div>
      <p className="muted">Every photo used on the website. Check that each one loads and shows the right subject. To replace one, change its URL in the CMS under <strong>Photos</strong> (or in <code>content/*.json</code>).</p>
      <PhotoGrid photos={photos} />
    </>
  );
}
