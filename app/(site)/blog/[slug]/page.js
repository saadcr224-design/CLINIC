import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import content from '@/lib/content';
import { srcset, fmtDate } from '@/lib/text';
import { Icon } from '@/components/Icons';
import SmartImage from '@/components/SmartImage';
import { PostCard, JsonLd } from '@/components/Cards';

export async function generateMetadata({ params }) {
  const post = content.post((await params).slug);
  return post ? { title: post.title, description: post.excerpt, openGraph: { type: 'article', images: [post.image] } } : {};
}

export default async function PostPage({ params }) {
  const post = content.post((await params).slug);
  if (!post) notFound();
  const site = content.site();
  const author = content.doctor(post.author);
  const depts = content.departmentMap();
  const related = content.posts().filter((p) => p.slug !== post.slug).slice(0, 3);
  const nonce = (await headers()).get('x-nonce') || undefined;
  const url = `${site.url}/blog/${post.slug}`;

  return (
    <>
      <JsonLd nonce={nonce} data={{
        '@context': 'https://schema.org', '@type': 'MedicalWebPage', headline: post.title, description: post.excerpt, image: post.image,
        datePublished: post.date, inLanguage: 'en', author: author ? { '@type': 'Physician', name: author.name } : undefined,
        reviewedBy: author ? { '@type': 'Physician', name: author.name } : undefined, publisher: { '@type': 'MedicalClinic', name: site.name },
      }} />
      <article>
        <header className="post-hero page-hero">
          <SmartImage className="page-hero-bg" src={post.image} srcSet={srcset(post.image, [800, 1200, 1800])} sizes="100vw" alt="" fetchPriority="high" />
          <div className="container narrow">
            <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/blog">Health Library</Link></nav>
            <h1>{post.title}</h1>
            <p className="post-meta">
              {author && (
                <>
                  <SmartImage portrait src={author.photo.replace(/w=\d+&h=\d+/, 'w=80&h=80')} alt="" width="40" height="40" className="avatar-img" />
                  <span>By <Link href={`/doctors/${author.slug}`}>{author.name}</Link></span> ·
                </>
              )}
              <time dateTime={post.date}>{fmtDate(post.date)}</time> · <span>{post.readMinutes} min read</span>
            </p>
          </div>
        </header>
        <div className="section">
          <div className="container narrow">
            {/* Article bodies are trusted HTML written by staff in the CMS. */}
            <div className="prose" dangerouslySetInnerHTML={{ __html: post.body }} />
            <p className="notice"><Icon name="shield" />Medically reviewed by our clinical team. For personal medical advice, please book a consultation.</p>
            <div className="share">
              <a className="btn btn-outline" href={`https://wa.me/?text=${encodeURIComponent(`${post.title} ${url}`)}`} target="_blank" rel="noopener"><Icon name="whatsapp" />WhatsApp</a>
              <a className="btn btn-outline" href={`https://x.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(post.title)}`} target="_blank" rel="noopener"><Icon name="x" />X</a>
              <Link className="btn btn-primary" href={`/book?dept=${post.category}`}><Icon name="calendar" />Book Appointment</Link>
            </div>
          </div>
        </div>
      </article>
      <section className="section section-alt">
        <div className="container">
          <h2>More articles</h2>
          <div className="grid grid-3">{related.map((p) => <PostCard key={p.slug} p={p} department={depts[p.category]} />)}</div>
        </div>
      </section>
    </>
  );
}
