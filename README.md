# Wahat Medical Center: clinic website

A bilingual (English / العربية, full RTL) clinic website with online booking, a patient portal,
a staff console, a chat assistant, and security controls suited to health data.
Built with Node.js + Express and server-rendered EJS templates. It needs no database server
to try out.

> **Placeholder content.** The clinic name, phone numbers, licence numbers, doctors, reviews,
> stats and accreditation badges are sample data. Replace them with your real details before
> launch, and only show accreditation (CBAHI, JCI, ISO…) that the clinic actually holds.

## Quick start

```bash
npm install
npm start            # http://localhost:3000   (Arabic: http://localhost:3000/ar)
npm test             # API, security and RBAC tests
```

In development, demo accounts are created automatically and listed on `/portal/login`:

| Role | Email | Password |
|---|---|---|
| patient | patient@demo.local | `Patient#Demo2026` |
| reception | reception@demo.local | `Reception#Demo2026` |
| doctor | doctor@demo.local | `Doctor#Demo2026` |
| admin | admin@demo.local | `Admin#Demo2026!` |

Demo accounts are **not** created when `NODE_ENV=production`. Create real ones with
`CLINIC_NEW_PASSWORD=... npm run seed -- you@clinic.sa "Your Name" admin`.

## What's included

**Pages** (all bilingual, `/…` English and `/ar/…` Arabic):
Home · About (mission, history, facility gallery, accreditation) · Doctors directory with
search and filters (specialty, day, gender) · Doctor profiles (qualifications, experience,
languages, clinic days, optional video intro) · Departments plus one page per department ·
Appointment booking · Contact (map, phones, emergency line, hours) · Health library (blog) ·
Patient reviews · FAQ · Careers · Insurance & payment · Privacy Policy · Terms ·
Data Protection notice · 404/500 pages.

**Features**
- **Online booking**: department → doctor (or "first available") → date → live time slots → details.
  Double-booking is prevented on the server. Confirmations go out by SMS, WhatsApp and email.
- **Emergency button** in the header on every page. It offers one-tap calls to 997 and the clinic
  ER line, plus an ambulance request form that can attach GPS location and alerts staff.
- **Click-to-call, WhatsApp** floating button, a mobile "Book" bar, and WhatsApp share and booking links.
- **Chat assistant** (rule-based, bilingual). It answers booking, hours, location, insurance and
  department questions, spots emergency keywords, and hands off to WhatsApp. It never gives medical advice.
- **Patient portal**: upcoming appointments, lab reports, prescriptions.
- **Staff console** (`/admin`): appointments with status updates, inbox (ambulance requests,
  messages, reviews awaiting moderation, job applications), and a tamper-evident audit log viewer.
- **Reviews** with star ratings. Submissions are held for moderation.
- **Newsletter signup**, careers applications, Google Maps embed with directions.
- **CMS**: `/cms/` runs [Decap CMS](https://decapcms.org) on top of the JSON files in `content/`, so staff
  can edit doctors, departments, articles, FAQs, reviews, jobs and insurers without a developer.
  The site reloads content files automatically when they change.

**SEO**: per-page titles and descriptions, canonical and `hreflang` (en/ar/x-default),
Open Graph, `sitemap.xml` with language alternates, `robots.txt`, and JSON-LD (`MedicalClinic`,
`Physician`, `MedicalWebPage`, `FAQPage`, `AggregateRating`). Optional Google Analytics 4
(`GA_MEASUREMENT_ID`) and Search Console verification.

**Accessibility**: semantic landmarks, skip link, labelled form controls, visible focus,
focus-trapped modal, `aria-live` status messages, alt text, reduced-motion support, and
readable font sizes and contrast.

**Performance**: server-rendered HTML, gzip compression, responsive `srcset` images with lazy
loading, a single CSS and JS file with no frameworks, and long cache headers in production.

## Security controls

| Area | Implementation |
|---|---|
| Encryption in transit | HTTPS enforced via HSTS (preload) and `upgrade-insecure-requests`. Terminate TLS at your load balancer/WAF. |
| Encryption at rest | All patient records (appointments, messages, users, ambulance requests…) are stored AES-256-GCM encrypted (`src/crypto.js`, `src/store.js`). The key comes from `DATA_KEY`. |
| Access control | Role-based: `patient`, `doctor` (own patients only), `reception`, `admin` (`src/auth.js`). bcrypt password hashes, session regeneration on login, 15-minute idle timeout, `__Host-` HttpOnly/Secure/SameSite cookies. |
| Audit logging | Every login, failure, denied access, record view and change is written to a SHA-256 hash-chained log (`src/audit.js`). The admin view verifies the chain and flags tampering. |
| Forms | CSRF tokens, CAPTCHA + honeypot, server-side validation (Saudi ID/Iqama, phone, email…), body size limits, per-IP rate limits, login throttling. |
| Headers | Strict CSP with nonces, `frame-ancestors 'none'`, nosniff, Referrer-Policy, Permissions-Policy, no `X-Powered-By`. |
| Other | Open-redirect protection, no stack traces sent to users, masked phone numbers and emails in logs, masked national IDs in the staff UI. |

### Production checklist
- [ ] Put the site behind a **WAF** (Cloudflare, AWS WAF, or ModSecurity + OWASP CRS) and terminate TLS there.
- [ ] Set `SESSION_SECRET` and `DATA_KEY` from a secret manager/KMS. Back up the key separately from the data.
- [ ] Host patient data **inside the Kingdom** (PDPL data residency). Move `src/store.js` to a managed database
      (PostgreSQL with encryption) and sessions to Redis before running more than one instance.
- [ ] Take encrypted, off-site daily backups of `DATA_DIR` and test that restores work.
- [ ] Ship `audit.log` to your SIEM. Schedule vulnerability scans (e.g. OWASP ZAP) and an annual penetration test.
- [ ] Turn on MFA for staff (e.g. through your identity provider in front of `/admin`).
- [ ] Replace the arithmetic CAPTCHA with Cloudflare Turnstile or hCaptcha (`checkBot` in `src/security.js`).
- [ ] Have the legal pages reviewed by counsel and your DPO (PDPL/SDAIA, MOH, NPHIES; HIPAA/GDPR for international patients).
- [ ] Integrate the booking flow with your HIS/EMR and NPHIES for eligibility checks, plus your CRM.
- [ ] Add a payment gateway (Moyasar, HyperPay or Tap support mada, Apple Pay and STC Pay) for online deposits.

## Configuration
See [`.env.example`](.env.example). Without credentials, notifications are printed to the console
with recipients masked. Add WhatsApp Cloud API, Twilio or email-relay credentials to send them for real.

## Photos
Photos are hot-linked from [Unsplash](https://unsplash.com/license), which is free for commercial use.
All image URLs live in `content/*.json` (`images`, `photo`, `image` fields), so you can swap them for your
own professional photos of the facility, equipment and staff in one place. Any image that fails to load
falls back to a branded placeholder.

## Project structure
```
server.js            app setup, security headers, sessions, routing
src/                 config, i18n, content loader, auth/RBAC, crypto, store, audit, notify, slots, chatbot, SEO
src/routes/          pages, api, portal, admin
content/             CMS-editable JSON (site settings, doctors, departments, posts, FAQs, reviews, jobs, insurance)
locales/             UI strings (en.json, ar.json)
views/               EJS templates (pages, partials, portal, admin, legal)
public/              CSS, JS, images, Decap CMS (/cms)
test/                node:test suite
```

## Docker
```bash
docker build -t clinic .
docker run -p 3000:3000 --env-file .env -v clinic-data:/var/lib/clinic clinic
```
