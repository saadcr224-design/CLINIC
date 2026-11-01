import content from '@/lib/content';
import { srcset } from '@/lib/text';
import { Icon } from '@/components/Icons';
import PageHero from '@/components/PageHero';
import SmartImage from '@/components/SmartImage';

export const metadata = { title: 'About us', description: 'For more than 25 years we have cared for families in Riyadh. Our mission, history, facility and accreditation.' };

const HISTORY = [
  ['2001', 'Founded as a family clinic with three doctors on Olaya Street.'],
  ['2008', 'Moved to our purpose-built centre on King Fahd Road.'],
  ['2012', 'First accreditation from the Saudi Central Board for Accreditation of Healthcare Institutions (CBAHI).'],
  ['2019', 'Launched online booking, patient portal and telemedicine.'],
  ['2025', 'Opened new cardiology, dermatology and ophthalmology suites.'],
];
const GALLERY = [['facility1', 'Patient room'], ['facility2', 'Operating theatre'], ['facility3', 'Inpatient suite'], ['facility4', 'Clinical team at work']];

export default function AboutPage() {
  const site = content.site();
  return (
    <>
      <PageHero heading="About us" lead="For more than 25 years we have cared for families in Riyadh with one simple promise: treat every patient the way we would want our own family treated." image={site.images.about} />
      <section className="section">
        <div className="container grid grid-3">
          <div className="value-card"><span className="feature-icon"><Icon name="heart" /></span><h2>Our mission</h2><p>To deliver safe, compassionate and evidence-based healthcare that is easy to access and centred on each patient&apos;s needs.</p></div>
          <div className="value-card"><span className="feature-icon"><Icon name="eye" /></span><h2>Our vision</h2><p>To be the most trusted outpatient medical centre in the Kingdom, recognised for clinical excellence and patient experience.</p></div>
          <div className="value-card"><span className="feature-icon"><Icon name="shield" /></span><h2>Our values</h2><p>Compassion · Integrity · Excellence · Privacy · Teamwork</p></div>
        </div>
      </section>
      <section className="section section-alt">
        <div className="container">
          <ul className="stats stats-light">{site.stats.map((s) => <li key={s.label}><strong>{s.value}</strong><span>{s.label}</span></li>)}</ul>
        </div>
      </section>
      <section className="section">
        <div className="container split">
          <div>
            <h2>Our history</h2>
            <ol className="timeline">{HISTORY.map(([y, text]) => <li key={y}><span className="year">{y}</span><p>{text}</p></li>)}</ol>
          </div>
          <div className="split-media">
            <SmartImage src={site.images.why} srcSet={srcset(site.images.why, [600, 1000])} sizes="(max-width: 900px) 100vw, 50vw" alt="Our medical team" loading="lazy" width="700" height="520" />
          </div>
        </div>
      </section>
      <section className="section section-alt">
        <div className="container">
          <h2>Our facility</h2>
          <div className="gallery">
            {GALLERY.map(([k, alt]) => (
              <figure key={k}>
                <SmartImage src={site.images[k]} srcSet={srcset(site.images[k], [400, 900])} sizes="(max-width: 700px) 50vw, 25vw" alt={alt} loading="lazy" width="450" height="320" />
                <figcaption>{alt}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="section-head"><div><h2>Accreditation &amp; licensing</h2><p>We are inspected and accredited by national and international bodies that set the standards for patient safety and quality.</p></div></div>
          <ul className="badges">{site.accreditations.map((a) => <li key={a.code}><Icon name="award" /><strong>{a.code}</strong><span>{a.label}</span></li>)}</ul>
        </div>
      </section>
    </>
  );
}
