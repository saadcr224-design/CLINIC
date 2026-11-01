import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import content from '@/lib/content';
import { Icon } from '@/components/Icons';
import PageHero from '@/components/PageHero';
import { DoctorCard, JsonLd } from '@/components/Cards';

export async function generateMetadata({ params }) {
  const d = content.department((await params).slug);
  return d ? { title: d.name, description: d.summary, openGraph: { images: [d.image] } } : {};
}

export default async function DepartmentPage({ params }) {
  const department = content.department((await params).slug);
  if (!department) notFound();
  const site = content.site();
  const doctors = content.doctors().filter((d) => d.department === department.slug);
  const nonce = (await headers()).get('x-nonce') || undefined;

  return (
    <>
      <JsonLd nonce={nonce} data={{ '@context': 'https://schema.org', '@type': 'MedicalSpecialty', name: department.name, description: department.description }} />
      <PageHero heading={department.name} lead={department.summary} image={department.image} crumbs={[['/departments', 'Departments']]} />
      <section className="section">
        <div className="container split split-wide">
          <div>
            <p className="lead-dark">{department.description}</p>
            <h2>Services we offer</h2>
            <ul className="checklist">{department.services.map((s) => <li key={s}><Icon name="check" />{s}</li>)}</ul>
          </div>
          <aside className="side-card">
            <h2>Book Appointment</h2>
            <p>Choose a department, doctor and time. You will receive confirmation by SMS, WhatsApp and email.</p>
            <Link className="btn btn-primary btn-block" href={`/book?dept=${department.slug}`}><Icon name="calendar" />Book Appointment</Link>
            <a className="btn btn-outline btn-block" href={`tel:${site.phone}`}><Icon name="phone" />{site.phoneDisplay}</a>
            <a className="btn btn-outline btn-block" href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noopener"><Icon name="whatsapp" />WhatsApp</a>
          </aside>
        </div>
      </section>
      {doctors.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <h2>Doctors in this department</h2>
            <div className="grid grid-4">{doctors.map((d) => <DoctorCard key={d.slug} d={d} department={department} />)}</div>
          </div>
        </section>
      )}
      <section className="section">
        <div className="container">
          <h2>Other departments</h2>
          <ul className="pill-links">
            {content.departments().filter((d) => d.slug !== department.slug).map((d) => (
              <li key={d.slug}><Link href={`/departments/${d.slug}`}><Icon name={d.icon} />{d.name}</Link></li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
