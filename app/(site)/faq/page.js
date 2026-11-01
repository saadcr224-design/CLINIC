import { headers } from 'next/headers';
import content from '@/lib/content';
import { Icon } from '@/components/Icons';
import PageHero from '@/components/PageHero';
import OpenButton from '@/components/OpenButton';
import { JsonLd } from '@/components/Cards';

export const metadata = { title: 'Frequently asked questions', description: 'Quick answers about appointments, insurance, privacy and emergencies.' };

const CATEGORIES = { appointments: 'Appointments', insurance: 'Insurance & payment', general: 'General', privacy: 'Privacy', emergency: 'Emergency' };

export default async function FaqPage() {
  const site = content.site();
  const faqs = content.faqs();
  const nonce = (await headers()).get('x-nonce') || undefined;
  return (
    <>
      <JsonLd nonce={nonce} data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }} />
      <PageHero heading="Frequently asked questions" lead="Quick answers to common questions. Can't find what you need? Chat with us or call." image={site.images.faq} />
      <section className="section">
        <div className="container narrow">
          {[...new Set(faqs.map((f) => f.category))].map((cat) => (
            <div key={cat}>
              <h2 className="faq-cat">{CATEGORIES[cat] || cat}</h2>
              <div className="accordion">
                {faqs.filter((f) => f.category === cat).map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}
              </div>
            </div>
          ))}
          <div className="card help-card">
            <p>Still have a question? Our team is happy to help.</p>
            <div className="btn-row">
              <OpenButton panel="chat" className="btn btn-primary"><Icon name="chat" />Chat with us</OpenButton>
              <a className="btn btn-outline" href={`tel:${site.phone}`}><Icon name="phone" />{site.phoneDisplay}</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
