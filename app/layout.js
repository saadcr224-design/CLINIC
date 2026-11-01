import './globals.css';
import { headers } from 'next/headers';
import Script from 'next/script';
import content from '@/lib/content';
import config from '@/lib/config';
import { IconSprite } from '@/components/Icons';
import { JsonLd } from '@/components/Cards';

export async function generateMetadata() {
  const site = content.site();
  return {
    metadataBase: new URL(site.url),
    title: { default: `${site.name} | ${site.tagline}`, template: `%s | ${site.name}` },
    description: '60+ consultants across 8 specialties, same-week appointments, and a 24/7 emergency department in the heart of Riyadh.',
    alternates: { canonical: './' },
    openGraph: { type: 'website', siteName: site.name, locale: 'en_US', images: [site.images.hero] },
    twitter: { card: 'summary_large_image' },
    icons: { icon: '/img/favicon.svg' },
    manifest: '/site.webmanifest',
    verification: config.gscVerification ? { google: config.gscVerification } : undefined,
  };
}

export const viewport = { themeColor: '#0b6574', width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }) {
  const nonce = (await headers()).get('x-nonce') || undefined;
  const site = content.site();
  const clinic = {
    '@context': 'https://schema.org',
    '@type': 'MedicalClinic',
    name: site.name,
    url: site.url,
    logo: `${site.url}/img/logo.svg`,
    image: site.images.hero,
    telephone: site.phone,
    email: site.email,
    address: { '@type': 'PostalAddress', streetAddress: site.address, addressLocality: 'Riyadh', addressCountry: 'SA' },
    geo: { '@type': 'GeoCoordinates', latitude: site.geo.lat, longitude: site.geo.lng },
    openingHoursSpecification: [
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'], opens: '08:00', closes: '22:00' },
      { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Friday', opens: '16:00', closes: '22:00' },
    ],
    medicalSpecialty: content.departments().map((d) => d.name),
    sameAs: Object.values(site.social),
  };
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="" />
        <link rel="preload" href="/fonts/plus-jakarta-sans.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>
        <IconSprite />
        <a className="skip-link" href="#main">Skip to main content</a>
        {children}
        <JsonLd data={clinic} nonce={nonce} />
        {config.gaId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${config.gaId}`} strategy="afterInteractive" nonce={nonce} />
            <Script id="ga" strategy="afterInteractive" nonce={nonce}>
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${config.gaId}',{anonymize_ip:true});`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
