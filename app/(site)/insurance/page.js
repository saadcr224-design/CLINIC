import Link from 'next/link';
import content from '@/lib/content';
import { Icon } from '@/components/Icons';
import PageHero from '@/components/PageHero';

export const metadata = { title: 'Insurance & payment', description: 'Accepted insurance providers and payment methods. Direct billing and NPHIES e-claims.' };

const STEPS = [
  'Bring your insurance card and National ID / Iqama.',
  'We verify eligibility instantly through NPHIES.',
  'Pre-authorisation, if needed, is handled by our team.',
  'You pay only your co-payment at the clinic.',
];

export default function InsurancePage() {
  const site = content.site();
  const insurance = content.insurance();
  return (
    <>
      <PageHero heading="Insurance & payment" lead="We work directly with the Kingdom's major insurers and submit claims electronically through NPHIES." image={site.images.insurance} />
      <section className="section">
        <div className="container">
          <h2>Accepted insurance providers</h2>
          <ul className="logo-grid">{insurance.providers.map((p) => <li key={p}><Icon name="shield" />{p}</li>)}</ul>
          <p className="muted">Don&apos;t see your insurer? Call us. We may still be able to help. <a href={`tel:${site.phone}`}>{site.phoneDisplay}</a></p>
        </div>
      </section>
      <section className="section section-alt">
        <div className="container split">
          <div>
            <h2>How it works</h2>
            <ol className="steps">{STEPS.map((s) => <li key={s}>{s}</li>)}</ol>
          </div>
          <div>
            <h2>Payment methods</h2>
            <ul className="logo-grid compact">{insurance.payments.map((p) => <li key={p}><Icon name="card" />{p}</li>)}</ul>
            <Link className="btn btn-primary" href="/book">Book Appointment</Link>
          </div>
        </div>
      </section>
    </>
  );
}
