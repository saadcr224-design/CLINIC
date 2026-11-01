import Link from 'next/link';
import SmartImage from './SmartImage';
import { srcset } from '@/lib/text';

// Photo-backed page header with breadcrumbs. crumbs: [[href, label], ...]
export default function PageHero({ heading, lead, image, crumbs = [], children }) {
  return (
    <section className="page-hero">
      <SmartImage className="page-hero-bg" src={image} srcSet={srcset(image, [800, 1200, 1800])} sizes="100vw" alt="" fetchPriority="high" />
      <div className="container">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          {crumbs.map(([href, label]) => (
            <span key={href} className="crumb"><span aria-hidden="true">/</span><Link href={href}>{label}</Link></span>
          ))}
          <span aria-hidden="true">/</span><span aria-current="page">{heading}</span>
        </nav>
        <h1>{heading}</h1>
        {lead && <p className="lead">{lead}</p>}
        {children}
      </div>
    </section>
  );
}
