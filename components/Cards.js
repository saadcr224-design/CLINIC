import Link from 'next/link';
import { Icon } from './Icons';
import SmartImage from './SmartImage';
import { srcset, fmtDate } from '@/lib/text';

export const CLINIC_DAYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu'];
export const DAY_NAMES = { sat: 'Sat', sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri' };

export function Days({ days }) {
  return (
    <ul className="days" aria-label="Clinic days">
      {CLINIC_DAYS.map((k) => <li key={k} className={days.includes(k) ? 'on' : ''}>{DAY_NAMES[k]}</li>)}
    </ul>
  );
}

export function Stars({ n }) {
  return (
    <span className="stars" aria-label={`${n} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => <Icon key={i} name="star" className={i <= n ? '' : 'off'} />)}
    </span>
  );
}

export function DoctorCard({ d, department }) {
  return (
    <article className="doctor-card">
      <Link className="doctor-photo" href={`/doctors/${d.slug}`} tabIndex={-1} aria-hidden="true">
        <SmartImage portrait src={d.photo} srcSet={srcset(d.photo, [300, 600])} sizes="(max-width: 600px) 90vw, 300px" alt={d.name} loading="lazy" width="300" height="350" />
      </Link>
      <div className="doctor-body">
        <span className="tag">{department ? department.name : ''}</span>
        <h3><Link href={`/doctors/${d.slug}`}>{d.name}</Link></h3>
        <p className="doctor-title">{d.title}</p>
        <p className="doctor-meta">
          <span className="rating"><Icon name="star" />{d.rating.toFixed(1)} <small>({d.reviews} reviews)</small></span>
          <span>{d.experience} years experience</span>
        </p>
        <Days days={d.days} />
        <Link className="btn btn-primary btn-block" href={`/book?doctor=${d.slug}`}>Book now</Link>
      </div>
    </article>
  );
}

export function ReviewCard({ r, department }) {
  return (
    <figure className="review-card">
      <Stars n={r.rating} />
      <blockquote><p>“{r.text}”</p></blockquote>
      <figcaption>
        <span className="avatar" aria-hidden="true">{r.name.charAt(0)}</span>
        <span><strong>{r.name}</strong><small><Icon name="check" />Verified patient{department ? ` · ${department.name}` : ''}</small></span>
      </figcaption>
    </figure>
  );
}

export function PostCard({ p, department }) {
  return (
    <article className="post-card">
      <Link href={`/blog/${p.slug}`} className="post-img" tabIndex={-1} aria-hidden="true">
        <SmartImage src={p.image} srcSet={srcset(p.image, [400, 800])} sizes="(max-width: 700px) 90vw, 400px" alt="" loading="lazy" width="400" height="250" />
      </Link>
      <div className="post-body">
        <p className="post-meta"><span className="tag">{department ? department.name : ''}</span><time dateTime={p.date}>{fmtDate(p.date)}</time></p>
        <h3><Link href={`/blog/${p.slug}`}>{p.title}</Link></h3>
        <p>{p.excerpt}</p>
        <Link className="link-arrow" href={`/blog/${p.slug}`}>Read article<Icon name="arrow" /></Link>
      </div>
    </article>
  );
}

export function SectionHead({ eyebrow, title, text, href }) {
  return (
    <div className="section-head">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {text && <p>{text}</p>}
      </div>
      {href && <Link className="link-arrow" href={href}>View all<Icon name="arrow" /></Link>}
    </div>
  );
}

// Structured data for search engines. The nonce lets it pass the strict CSP.
export function JsonLd({ data, nonce }) {
  return <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
