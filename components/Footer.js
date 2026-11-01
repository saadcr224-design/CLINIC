import Link from 'next/link';
import { Icon } from './Icons';
import SmartImage from './SmartImage';
import AjaxForm, { Honeypot } from './AjaxForm';
import OpenButton from './OpenButton';
import { srcset } from '@/lib/text';

export default function Footer({ site, departments }) {
  return (
    <>
      <section className="newsletter photo-band">
        <SmartImage className="band-bg" src={site.images.newsletter} srcSet={srcset(site.images.newsletter, [800, 1400, 1800])} sizes="100vw" alt="" loading="lazy" />
        <div className="container newsletter-inner">
          <div>
            <h2>Monthly health tips</h2>
            <p>Seasonal advice, clinic news and wellness programmes. No spam.</p>
          </div>
          <AjaxForm action="/api/newsletter" className="newsletter-form">
            <label className="sr-only" htmlFor="nl-email">Your email</label>
            <input id="nl-email" type="email" name="email" required autoComplete="email" placeholder="Your email" />
            <Honeypot />
            <button className="btn btn-accent" type="submit">Subscribe</button>
          </AjaxForm>
        </div>
      </section>
      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <Link className="logo logo-light" href="/"><img src="/img/logo.svg" alt="" width="40" height="40" /><span><strong>{site.name}</strong><small>{site.tagline}</small></span></Link>
            <address>
              <p><Icon name="pin" />{site.address}</p>
              <p><Icon name="phone" /><a href={`tel:${site.phone}`}>{site.phoneDisplay}</a></p>
              <p><Icon name="mail" /><a href={`mailto:${site.email}`}>{site.email}</a></p>
            </address>
            <ul className="social">
              {Object.entries(site.social).map(([k, v]) => (
                <li key={k}><a href={v} target="_blank" rel="noopener" aria-label={k}><Icon name={k} /></a></li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Quick links</h3>
            <ul>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/doctors">Doctors</Link></li>
              <li><Link href="/blog">Health Library</Link></li>
              <li><Link href="/careers">Careers</Link></li>
              <li><Link href="/contact">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h3>Departments</h3>
            <ul>{departments.slice(0, 6).map((d) => <li key={d.slug}><Link href={`/departments/${d.slug}`}>{d.name}</Link></li>)}</ul>
          </div>
          <div>
            <h3>For patients</h3>
            <ul>
              <li><Link href="/book">Book Appointment</Link></li>
              <li><Link href="/portal">Patient Portal</Link></li>
              <li><Link href="/insurance">Insurance &amp; Payment</Link></li>
              <li><Link href="/testimonials">Patient Reviews</Link></li>
              <li><Link href="/faq">FAQ</Link></li>
            </ul>
            <h3 className="mt">Working hours</h3>
            <ul className="hours">{site.hours.map((h) => <li key={h.days}><span>{h.days}</span><span>{h.time}</span></li>)}</ul>
          </div>
        </div>
        <div className="container footer-bottom">
          <p>© {new Date().getFullYear()} {site.name}. All rights reserved. · MOH License No. 0000000 · Commercial Registration 0000000000</p>
          <ul>
            <li><Link href="/privacy">Privacy Policy</Link></li>
            <li><Link href="/terms">Terms of Use</Link></li>
            <li><Link href="/data-protection">Data Protection Notice</Link></li>
          </ul>
        </div>
      </footer>

      <div className="fab-stack">
        <a className="fab fab-wa" href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noopener" aria-label="WhatsApp"><Icon name="whatsapp" /></a>
        <OpenButton panel="chat" className="fab fab-chat" aria-label="Chat with us"><Icon name="chat" /></OpenButton>
      </div>
      <nav className="mobile-bar" aria-label="Quick actions">
        <a href={`tel:${site.phone}`}><Icon name="phone" />Call</a>
        <Link className="primary" href="/book"><Icon name="calendar" />Book now</Link>
        <a href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noopener"><Icon name="whatsapp" />WhatsApp</a>
      </nav>
    </>
  );
}
