import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import content from '@/lib/content';
import { srcset } from '@/lib/text';
import { Icon } from '@/components/Icons';
import PageHero from '@/components/PageHero';
import SmartImage from '@/components/SmartImage';
import { Days, ReviewCard, JsonLd } from '@/components/Cards';

export async function generateMetadata({ params }) {
  const doctor = content.doctor((await params).slug);
  if (!doctor) return {};
  return { title: doctor.name, description: doctor.bio, openGraph: { images: [doctor.photo] } };
}

export default async function DoctorPage({ params }) {
  const doctor = content.doctor((await params).slug);
  if (!doctor) notFound();
  const site = content.site();
  const department = content.department(doctor.department);
  const reviews = content.testimonials().filter((r) => r.department === doctor.department);
  const nonce = (await headers()).get('x-nonce') || undefined;
  const waText = encodeURIComponent(`I would like to book with ${doctor.name}`);

  return (
    <>
      <JsonLd nonce={nonce} data={{
        '@context': 'https://schema.org', '@type': 'Physician', name: doctor.name, image: doctor.photo,
        medicalSpecialty: department?.name, description: doctor.bio, telephone: site.phone, url: `${site.url}/doctors/${doctor.slug}`,
        aggregateRating: { '@type': 'AggregateRating', ratingValue: doctor.rating, reviewCount: doctor.reviews },
        address: { '@type': 'PostalAddress', streetAddress: site.address, addressLocality: 'Riyadh', addressCountry: 'SA' },
      }} />
      <PageHero heading={doctor.name} lead={doctor.title} image={site.images.doctors} crumbs={[['/doctors', 'Doctors']]} />
      <section className="section doctor-profile">
        <div className="container profile-grid">
          <div className="profile-photo">
            <SmartImage portrait src={doctor.photo} srcSet={srcset(doctor.photo, [400, 600])} sizes="(max-width: 800px) 90vw, 360px" alt={doctor.name} width="380" height="440" />
          </div>
          <div>
            <span className="tag">{department?.name}</span>
            <p className="doctor-meta lg">
              <span className="rating"><Icon name="star" />{doctor.rating.toFixed(1)} <small>({doctor.reviews} reviews)</small></span>
              <span>{doctor.experience} years experience</span>
            </p>
            <dl className="profile-facts">
              <div><dt>Qualifications</dt><dd>{doctor.qualifications}</dd></div>
              <div><dt>Languages</dt><dd>{doctor.languages.join(', ')}</dd></div>
              <div><dt>Clinic days</dt><dd><Days days={doctor.days} /></dd></div>
            </dl>
            <h2>About</h2>
            <p>{doctor.bio}</p>
            {doctor.video && (
              <>
                <h2>Video introduction</h2>
                <div className="video-frame"><iframe src={doctor.video} title="Video introduction" loading="lazy" allowFullScreen /></div>
              </>
            )}
            <div className="btn-row">
              <Link className="btn btn-primary btn-lg" href={`/book?doctor=${doctor.slug}`}><Icon name="calendar" />Book with {doctor.name}</Link>
              <a className="btn btn-outline btn-lg" href={`https://wa.me/${site.whatsapp}?text=${waText}`} target="_blank" rel="noopener"><Icon name="whatsapp" />WhatsApp</a>
            </div>
          </div>
        </div>
      </section>
      {reviews.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <h2>Patient reviews</h2>
            <div className="grid grid-3">{reviews.map((r) => <ReviewCard key={r.name + r.date} r={r} department={department} />)}</div>
          </div>
        </section>
      )}
    </>
  );
}
