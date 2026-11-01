import { Fragment } from 'react';
import { headers } from 'next/headers';
import content from '@/lib/content';
import { Icon } from '@/components/Icons';
import PageHero from '@/components/PageHero';
import AjaxForm, { Captcha } from '@/components/AjaxForm';
import { ReviewCard, Stars, JsonLd } from '@/components/Cards';

export const metadata = { title: 'Patient reviews', description: 'Real feedback from patients, collected after their visits.' };

export default async function TestimonialsPage() {
  const site = content.site();
  const reviews = content.testimonials();
  const depts = content.departmentMap();
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / (reviews.length || 1);
  const nonce = (await headers()).get('x-nonce') || undefined;
  return (
    <>
      <JsonLd nonce={nonce} data={{
        '@context': 'https://schema.org', '@type': 'MedicalClinic', name: site.name,
        aggregateRating: { '@type': 'AggregateRating', ratingValue: avg.toFixed(1), reviewCount: reviews.length },
        review: reviews.map((r) => ({ '@type': 'Review', author: { '@type': 'Person', name: r.name }, reviewRating: { '@type': 'Rating', ratingValue: r.rating }, reviewBody: r.text, datePublished: r.date })),
      }} />
      <PageHero heading="Patient reviews" lead="Real feedback from patients, collected after their visits." image={site.images.testimonials} />
      <section className="section">
        <div className="container">
          <div className="rating-summary">
            <strong>{avg.toFixed(1)}</strong>
            <div><Stars n={Math.round(avg)} /><p>average from {reviews.length} reviews</p></div>
          </div>
          <div className="grid grid-3">{reviews.map((r) => <ReviewCard key={r.name + r.date} r={r} department={depts[r.department]} />)}</div>
        </div>
      </section>
      <section className="section section-alt">
        <div className="container narrow">
          <AjaxForm action="/api/reviews" captcha className="card">
            <h2>Leave a review</h2>
            <p className="muted">Visited us recently? Your feedback helps other patients and helps us improve.</p>
            <div className="row-2">
              <div className="field"><label htmlFor="r-name">Full name *</label><input id="r-name" name="name" required maxLength={80} autoComplete="name" /></div>
              <div className="field">
                <label htmlFor="r-dept">Department</label>
                <select id="r-dept" name="department" defaultValue=""><option value="">—</option>{Object.values(depts).map((d) => <option key={d.slug} value={d.slug}>{d.name}</option>)}</select>
              </div>
            </div>
            <fieldset className="field star-input">
              <legend>Your rating *</legend>
              {[5, 4, 3, 2, 1].map((i) => (
                <Fragment key={i}>
                  <input type="radio" id={`star${i}`} name="rating" value={i} defaultChecked={i === 5} />
                  <label htmlFor={`star${i}`} title={`${i}`}><Icon name="star" /><span className="sr-only">{i} stars</span></label>
                </Fragment>
              ))}
            </fieldset>
            <div className="field"><label htmlFor="r-text">Your review *</label><textarea id="r-text" name="text" rows={4} required maxLength={1000} /></div>
            <Captcha id="r" />
            <button className="btn btn-primary" type="submit">Submit</button>
          </AjaxForm>
        </div>
      </section>
    </>
  );
}
