import content from '@/lib/content';
import { Icon } from '@/components/Icons';
import PageHero from '@/components/PageHero';
import AjaxForm, { Captcha } from '@/components/AjaxForm';

export const metadata = { title: 'Contact us', description: 'Reach us by phone, WhatsApp, email or the contact form. Address, map, emergency line and working hours.' };

export default function ContactPage() {
  const site = content.site();
  return (
    <>
      <PageHero heading="Contact us" lead="We're here to help. Reach us by phone, WhatsApp, email or the form below." image={site.images.contact} />
      <section className="section">
        <div className="container contact-grid">
          <div className="contact-cards">
            <a className="contact-card" href={`tel:${site.phone}`}><Icon name="phone" /><div><strong>Call</strong><span>{site.phoneDisplay}</span></div></a>
            <a className="contact-card emergency" href={`tel:${site.emergencyPhone}`}><Icon name="ambulance" /><div><strong>Emergency line (24/7)</strong><span>{site.emergencyPhoneDisplay}</span></div></a>
            <a className="contact-card wa" href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noopener"><Icon name="whatsapp" /><div><strong>WhatsApp</strong><span>+{site.whatsapp}</span></div></a>
            <a className="contact-card" href={`mailto:${site.email}`}><Icon name="mail" /><div><strong>Email</strong><span>{site.email}</span></div></a>
            <div className="contact-card"><Icon name="pin" /><div><strong>Address</strong><span>{site.address}</span><a href={site.mapDirections} target="_blank" rel="noopener">Get directions →</a></div></div>
            <div className="contact-card"><Icon name="clock" /><div><strong>Working hours</strong>{site.hours.map((h) => <span key={h.days}>{h.days}: {h.time}</span>)}</div></div>
          </div>
          <AjaxForm action="/api/contact" captcha className="card">
            <h2>Send us a message</h2>
            <p className="notice"><Icon name="shield" />Please don&apos;t include detailed medical information in this form. For medical questions, book a consultation.</p>
            <div className="row-2">
              <div className="field"><label htmlFor="c-name">Full name *</label><input id="c-name" name="name" required autoComplete="name" maxLength={80} /></div>
              <div className="field"><label htmlFor="c-email">Email *</label><input id="c-email" name="email" type="email" required autoComplete="email" maxLength={254} /></div>
              <div className="field"><label htmlFor="c-phone">Mobile number</label><input id="c-phone" name="phone" type="tel" autoComplete="tel" maxLength={20} /></div>
              <div className="field">
                <label htmlFor="c-subject">Subject *</label>
                <select id="c-subject" name="subject" required defaultValue="general">
                  <option value="general">General enquiry</option>
                  <option value="appointment">Appointment</option>
                  <option value="billing">Billing &amp; insurance</option>
                  <option value="feedback">Feedback or complaint</option>
                </select>
              </div>
            </div>
            <div className="field"><label htmlFor="c-msg">Message *</label><textarea id="c-msg" name="message" rows={5} required maxLength={2000} /></div>
            <Captcha id="c" />
            <button className="btn btn-primary btn-lg" type="submit">Submit</button>
          </AjaxForm>
        </div>
        <div className="container">
          <div className="map-frame map-wide"><iframe title={`${site.name} map`} src={site.mapEmbed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen /></div>
        </div>
      </section>
    </>
  );
}
