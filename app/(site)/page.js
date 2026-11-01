import Link from 'next/link';
import content from '@/lib/content';
import { srcset } from '@/lib/text';
import { Icon } from '@/components/Icons';
import SmartImage from '@/components/SmartImage';
import { DoctorCard, ReviewCard, PostCard, SectionHead } from '@/components/Cards';

const WHY = [
  ['award', 'Board-certified specialists', 'Consultants trained in Saudi Arabia, the UK, Canada and Europe.'],
  ['calendar', 'Book in 60 seconds', 'Online booking with instant SMS & WhatsApp confirmation and reminders.'],
  ['shield', 'Your data, protected', 'Encrypted records, role-based access and full audit trails, PDPL compliant.'],
  ['card', 'Insurance made simple', 'Direct billing with 12+ insurers and NPHIES-ready e-claims.'],
];

export default function HomePage() {
  const site = content.site();
  const departments = content.departments();
  const depts = content.departmentMap();
  const doctors = content.doctors().slice(0, 4);
  const posts = content.posts().slice(0, 3);
  const reviews = content.testimonials().slice(0, 3);
  const img = site.images;

  return (
    <>
      <section className="hero">
        <SmartImage className="hero-bg" src={img.hero} srcSet={srcset(img.hero, [800, 1200, 1800])} sizes="100vw" alt="" fetchPriority="high" />
        <div className="container hero-inner">
          <span className="pill"><span className="dot" />Now accepting new patients</span>
          <h1>Expert care for every member of your family</h1>
          <p className="lead">60+ consultants across 8 specialties, same-week appointments, and a 24/7 emergency department in the heart of Riyadh.</p>
          <div className="hero-actions">
            <Link className="btn btn-accent btn-lg" href="/book"><Icon name="calendar" />Book Appointment</Link>
            <Link className="btn btn-ghost btn-lg" href="/doctors"><Icon name="search" />Find a doctor</Link>
          </div>
          <form className="hero-search" action="/doctors" method="get" role="search">
            <label className="sr-only" htmlFor="hero-q">Search doctor, specialty or condition</label>
            <Icon name="search" />
            <input id="hero-q" name="q" placeholder="Search doctor, specialty or condition" />
            <select name="dept" aria-label="Specialty" defaultValue="">
              <option value="">All specialties</option>
              {departments.map((d) => <option key={d.slug} value={d.slug}>{d.name}</option>)}
            </select>
            <button className="btn btn-primary" type="submit">Search</button>
          </form>
        </div>
      </section>

      <section className="quick-info" aria-label="Clinic information">
        <div className="container quick-grid">
          <a className="quick-card emergency" href={`tel:${site.emergencyPhone}`}><Icon name="ambulance" /><span><strong>24/7 Emergency</strong>{site.emergencyPhoneDisplay}</span></a>
          <div className="quick-card"><Icon name="clock" /><span><strong>{site.hours[0].days}</strong>{site.hours[0].time}</span></div>
          <a className="quick-card" href={site.mapDirections} target="_blank" rel="noopener"><Icon name="pin" /><span><strong>Al Olaya, Riyadh</strong>Get directions →</span></a>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead eyebrow="Specialties" title="Our specialties" text="Comprehensive outpatient care under one roof, supported by on-site lab, radiology and pharmacy." href="/departments" />
          <div className="grid grid-4">
            {departments.map((d) => (
              <Link key={d.slug} className="photo-card" href={`/departments/${d.slug}`}>
                <SmartImage src={d.image} srcSet={srcset(d.image, [400, 700])} sizes="(max-width: 640px) 92vw, (max-width: 960px) 46vw, 290px" alt="" loading="lazy" width="400" height="300" />
                <span className="photo-card-body">
                  <span className="photo-card-icon"><Icon name={d.icon} /></span>
                  <strong>{d.name}</strong>
                  <small>{d.summary}</small>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container split">
          <div className="split-media">
            <SmartImage src={img.why} srcSet={srcset(img.why, [600, 1000, 1200])} sizes="(max-width: 900px) 100vw, 50vw" alt="Doctor consulting with a patient" loading="lazy" width="700" height="525" />
            <div className="float-badge"><Icon name="star" /><strong>{site.stats[3].value}</strong><span>{site.stats[3].label}</span></div>
          </div>
          <div>
            <span className="eyebrow">Why us</span>
            <h2>Why patients choose us</h2>
            <ul className="features">
              {WHY.map(([ic, title, text]) => (
                <li key={title}><span className="feature-icon"><Icon name={ic} /></span><div><h3>{title}</h3><p>{text}</p></div></li>
              ))}
            </ul>
            <ul className="badge-row" aria-label="Accredited & licensed">
              {site.accreditations.map((a) => <li key={a.code}><Icon name="award" />{a.label}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="stats-band photo-band">
        <SmartImage className="band-bg" src={img.facility2} srcSet={srcset(img.facility2, [800, 1400])} sizes="100vw" alt="" loading="lazy" />
        <div className="container">
          <ul className="stats">{site.stats.map((s) => <li key={s.label}><strong>{s.value}</strong><span>{s.label}</span></li>)}</ul>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead eyebrow="Our team" title="Meet our specialists" href="/doctors" />
          <div className="grid grid-4">{doctors.map((d) => <DoctorCard key={d.slug} d={d} department={depts[d.department]} />)}</div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <SectionHead eyebrow="Reviews" title="What our patients say" href="/testimonials" />
          <div className="grid grid-3">{reviews.map((r) => <ReviewCard key={r.name + r.date} r={r} department={depts[r.department]} />)}</div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead eyebrow="Health library" title="From our health library" href="/blog" />
          <div className="grid grid-3">{posts.map((p) => <PostCard key={p.slug} p={p} department={depts[p.category]} />)}</div>
        </div>
      </section>

      <section className="cta-band photo-band">
        <SmartImage className="band-bg" src={img.cta} srcSet={srcset(img.cta, [800, 1400, 1800])} sizes="100vw" alt="" loading="lazy" />
        <div className="container cta-inner">
          <div><h2>Ready to see a specialist?</h2><p>Choose your doctor and time online. It takes less than a minute.</p></div>
          <div className="cta-actions">
            <Link className="btn btn-accent btn-lg" href="/book">Book Appointment</Link>
            <a className="btn btn-ghost btn-lg" href={`tel:${site.phone}`}><Icon name="phone" />{site.phoneDisplay}</a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container split">
          <div>
            <span className="eyebrow">Visit us</span>
            <h2>Contact</h2>
            <ContactList site={site} />
            <a className="btn btn-outline" href={site.mapDirections} target="_blank" rel="noopener"><Icon name="pin" />Get directions</a>
          </div>
          <div className="map-frame">
            <iframe title={`${site.name} on Google Maps`} src={site.mapEmbed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
          </div>
        </div>
      </section>
    </>
  );
}

function ContactList({ site }) {
  return (
    <ul className="contact-list">
      <li><Icon name="pin" /><div><strong>Address</strong><p>{site.address}</p></div></li>
      <li><Icon name="phone" /><div><strong>Call</strong><p><a href={`tel:${site.phone}`}>{site.phoneDisplay}</a></p></div></li>
      <li><Icon name="clock" /><div><strong>Working hours</strong>{site.hours.map((h) => <p key={h.days}>{h.days}: {h.time}</p>)}</div></li>
    </ul>
  );
}
