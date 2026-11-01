import Link from 'next/link';
import content from '@/lib/content';
import SiteLayout from './(site)/layout';
import PageHero from '@/components/PageHero';

export const metadata = { title: 'Page not found', robots: { index: false } };

export default function NotFound() {
  return (
    <SiteLayout>
      <PageHero heading="Page not found" image={content.site().images.hero} />
      <section className="section error-page">
        <div className="container narrow center">
          <p className="error-code">404</p>
          <p className="lead-dark">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
          <div className="btn-row center"><Link className="btn btn-primary" href="/">Home</Link><Link className="btn btn-outline" href="/contact">Contact</Link></div>
        </div>
      </section>
    </SiteLayout>
  );
}
