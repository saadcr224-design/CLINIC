import Link from 'next/link';
import content from '@/lib/content';
import PageHero from '@/components/PageHero';
import { PostCard } from '@/components/Cards';

export const metadata = { title: 'Health library', description: 'Practical health advice written and reviewed by our doctors.' };

export default async function BlogPage({ searchParams }) {
  const topic = String((await searchParams).topic || '');
  const depts = content.departmentMap();
  const posts = content.posts().filter((p) => !topic || p.category === topic);
  return (
    <>
      <PageHero heading="Health library" lead="Practical health advice written and reviewed by our doctors." image={content.site().images.blog} />
      <section className="section">
        <div className="container">
          <ul className="pill-links" aria-label="Topics">
            <li><Link href="/blog" aria-current={!topic ? 'page' : undefined}>All topics</Link></li>
            {Object.values(depts).map((d) => (
              <li key={d.slug}><Link href={`/blog?topic=${d.slug}`} aria-current={topic === d.slug ? 'page' : undefined}>{d.name}</Link></li>
            ))}
          </ul>
          {posts.length ? (
            <div className="grid grid-3">{posts.map((p) => <PostCard key={p.slug} p={p} department={depts[p.category]} />)}</div>
          ) : (
            <p className="empty">No articles on this topic yet.</p>
          )}
        </div>
      </section>
    </>
  );
}
