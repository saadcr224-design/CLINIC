'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from './Icons';
import { openPanel } from './OpenButton';

const MAIN = [['/about', 'About'], ['/departments', 'Departments'], ['/doctors', 'Doctors'], ['/blog', 'Health Library'], ['/contact', 'Contact']];
const MORE = [['/insurance', 'Insurance & Payment'], ['/testimonials', 'Patient Reviews'], ['/faq', 'FAQ'], ['/careers', 'Careers'], ['/portal', 'Patient Portal']];

export default function Header({ site }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => { setOpen(false); setMoreOpen(false); }, [pathname]);

  const link = ([href, label]) => (
    <li key={href}>
      <Link href={href} aria-current={pathname.startsWith(href) ? 'page' : undefined}>{label}</Link>
    </li>
  );

  return (
    <header className="site-header" id="top">
      <div className="container header-inner">
        <Link className="logo" href="/" aria-label={`${site.name} home`}>
          <img src="/img/logo.svg" alt="" width="40" height="40" />
          <span><strong>{site.name}</strong><small>Riyadh · Since 2001</small></span>
        </Link>
        <nav className={`main-nav${open ? ' open' : ''}`} id="main-nav" aria-label="Main">
          <ul>
            {MAIN.map(link)}
            <li className="has-sub">
              <button type="button" className="sub-toggle" aria-expanded={moreOpen} onClick={() => setMoreOpen((v) => !v)}>More</button>
              <ul className={`sub${moreOpen ? ' open' : ''}`}>{MORE.map(link)}</ul>
            </li>
            {MORE.map(([href, label]) => (
              <li key={`m-${href}`} className="nav-mobile-only"><Link href={href}>{label}</Link></li>
            ))}
          </ul>
        </nav>
        <div className="header-cta">
          <a className="header-phone" href={`tel:${site.phone}`}><Icon name="phone" /><span><small>Call us</small>{site.phoneDisplay}</span></a>
          <button type="button" className="btn btn-emergency btn-sm" aria-label="Emergency help" onClick={() => openPanel('emergency')}>
            <Icon name="ambulance" /><span>Emergency</span>
          </button>
          <Link className="btn btn-primary btn-sm hide-sm-down" href="/book">Book Appointment</Link>
          <button type="button" className="nav-toggle" aria-controls="main-nav" aria-expanded={open} aria-label="Menu" onClick={() => setOpen((v) => !v)}>
            <Icon name="menu" />
          </button>
        </div>
      </div>
    </header>
  );
}
