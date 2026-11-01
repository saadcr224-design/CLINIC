# Wahat Medical Center: clinic website (React / Next.js)

A clean, fast, photo-led clinic website built with **React** on **[Next.js](https://nextjs.org)**
(App Router). It includes online booking, automated patient messaging, a patient portal, a staff
console, a chat assistant, and security controls suited to health data. Pages are rendered on the
server for speed and SEO, and interactive parts (booking, chat, emergency, forms) are React client
components.

> **Placeholder content.** The clinic name, phone numbers, licence numbers, doctors, reviews,
> stats and accreditation badges are sample data. Replace them with your real details before
> launch, and only show accreditation (CBAHI, JCI, ISO…) that the clinic actually holds.

## Quick start

```bash
npm install
npm run dev          # development server on http://localhost:3000
npm test             # unit tests (booking, security, RBAC, audit, automation)
```

Production build:

```bash
npm run build
npm start
```

Browser smoke test against a running site (needs demo accounts on):

```bash
BASE_URL=http://localhost:3000 npm run test:e2e
```

Demo accounts are on in development (`npm run dev`) and listed on `/portal/login`. In production
they're off unless you set `DEMO_ACCOUNTS=true`, which is handy for a demo deployment. Turn it off
before real patients use the site.

| Role | Email | Password |
|---|---|---|
| patient | patient@demo.local | `Patient#Demo2026` |
| reception | reception@demo.local | `Reception#Demo2026` |
| doctor | doctor@demo.local | `Doctor#Demo2026` |
| admin | admin@demo.local | `Admin#Demo2026!` |

Create real accounts with `CLINIC_NEW_PASSWORD=... npm run seed -- you@clinic.sa "Your Name" admin`.

## What's included

**Pages**: Home · About (mission, history, facility gallery, accreditation) · Doctors directory with
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
- **Chat assistant** (rule-based). It answers booking, hours, location, insurance and
  department questions, spots emergency keywords, and hands off to WhatsApp. It never gives medical advice.
- **Patient portal**: upcoming appointments, lab reports, prescriptions.
- **Staff console** (`/admin`): appointments with status updates, inbox (ambulance requests,
  messages, reviews awaiting moderation, job applications), and a tamper-evident audit log viewer.
- **Reviews** with star ratings. Submissions are held for moderation.
- **Newsletter signup**, careers applications, Google Maps embed with directions.
- **CMS**: `/cms/` runs [Decap CMS](https://decapcms.org) on top of the JSON files in `content/`, so staff
  can edit doctors, departments, articles, FAQs, reviews, jobs, insurers, photos and legal text
  (`content/legal/*.html`) without a developer. Each save is a git commit, which redeploys the site.

**SEO**: per-page titles and descriptions, canonical URLs,
Open Graph, `sitemap.xml`, `robots.txt`, and JSON-LD (`MedicalClinic`,
`Physician`, `MedicalWebPage`, `FAQPage`, `AggregateRating`). Optional Google Analytics 4
(`GA_MEASUREMENT_ID`) and Search Console verification.

**Accessibility**: semantic landmarks, skip link, labelled form controls, visible focus,
focus-trapped modal, `aria-live` status messages, alt text, reduced-motion support, and
readable font sizes and contrast.

**Performance**: server-rendered React (HTML arrives ready to read; about 105 kB of shared JS),
a self-hosted variable font (no third-party font requests), responsive `srcset` images with lazy
loading below the fold, automatic code splitting per page, and long cache headers for static assets.

**Automation** (`lib/automation.js`; started by `instrumentation.js` every 10 minutes on a normal server, or daily by Vercel Cron):
- Instant booking confirmation by SMS, WhatsApp and email.
- Reminder 24 hours before each appointment, sent once.
- Review request 2 to 72 hours after a visit is marked *completed*.
- Auto-reply email to every contact-form message, plus staff alerts for new enquiries and ambulance requests.
- Every automated run is recorded in the audit log.

## Security controls

| Area | Implementation |
|---|---|
| Encryption in transit | HTTPS enforced via HSTS (preload) and `upgrade-insecure-requests`. Terminate TLS at your load balancer/WAF. |
| Encryption at rest | All patient records (appointments, messages, users, ambulance requests…) are stored AES-256-GCM encrypted (`lib/crypto.js`, `lib/store.js`). The key comes from `DATA_KEY`. |
| Access control | Role-based: `patient`, `doctor` (own patients only), `reception`, `admin` (`lib/auth.js`), checked on every staff page and API route. bcrypt password hashes, a fresh session on login, 15-minute idle timeout, encrypted `__Host-` HttpOnly/Secure/SameSite cookie sessions (iron-session, no server-side store needed). |
| Audit logging | Every login, failure, denied access, record view and change is written to a SHA-256 hash-chained log (`lib/audit.js`). The admin view verifies the chain and flags tampering. |
| Forms | CSRF tokens, CAPTCHA + honeypot (single-use, stored as a keyed hash), JSON-only API with body size limits, server-side validation (Saudi ID/Iqama, phone, email…), per-IP rate limits, login throttling (`lib/security.js`, `lib/http.js`). |
| Headers | Strict CSP with a fresh nonce per request and `strict-dynamic` (`middleware.js`), HSTS, `frame-ancestors 'none'`, nosniff, Referrer-Policy, Permissions-Policy, no `X-Powered-By` (`next.config.mjs`). |
| Other | Open-redirect protection, no stack traces sent to users, masked phone numbers and emails in logs, masked national IDs in the staff UI. |

### Production checklist
- [ ] Put the site behind a **WAF** (Cloudflare, AWS WAF, or ModSecurity + OWASP CRS) and terminate TLS there.
- [ ] Set `SESSION_SECRET` and `DATA_KEY` from a secret manager/KMS. Back up the key separately from the data.
- [ ] Host patient data **inside the Kingdom** (PDPL data residency). Move `lib/store.js` to a managed database
      (PostgreSQL with encryption) before running more than one instance. Rate limits are per instance;
      for stronger limits use your WAF or a shared store such as Upstash Redis.
- [ ] Take encrypted, off-site daily backups of `DATA_DIR` and test that restores work.
- [ ] Ship `audit.log` to your SIEM. Schedule vulnerability scans (e.g. OWASP ZAP) and an annual penetration test.
- [ ] Turn on MFA for staff (e.g. through your identity provider in front of `/admin`).
- [ ] Replace the arithmetic CAPTCHA with Cloudflare Turnstile or hCaptcha (`checkBot` in `lib/security.js`).
- [ ] Have the legal pages reviewed by counsel and your DPO (PDPL/SDAIA, MOH, NPHIES; HIPAA/GDPR for international patients).
- [ ] Integrate the booking flow with your HIS/EMR and NPHIES for eligibility checks, plus your CRM.
- [ ] Add a payment gateway (Moyasar, HyperPay or Tap support mada, Apple Pay and STC Pay) for online deposits.

## Configuration
See [`.env.example`](.env.example). Without credentials, notifications are printed to the console
with recipients masked. Add WhatsApp Cloud API, Twilio or email-relay credentials to send them for real.

## Photos
Every page has a real photo background. Photos are hot-linked from [Unsplash](https://unsplash.com/license),
which is free for commercial use.
- Page backgrounds and backup photos live in `content/photos.json`, editable in the CMS under **Photos**.
- Doctor portraits, department and article images live in their own content files.
- If a photo fails to load, the browser swaps in a backup real photo (a portrait for doctors), and only
  then a branded placeholder.
- **Staff console → Photos** (`/admin/photos`) shows every photo the site uses and flags any that fail,
  so you can check them at a glance.

For the best result, replace them with your own professional photos of the facility, equipment and staff.

## Project structure
```
app/                 Next.js App Router
  layout.js          <html>, metadata, icon sprite, clinic structured data, analytics
  (site)/            public pages (home, about, doctors, departments, book, contact, blog, ...)
  admin/             staff console (appointments, inbox, audit log, photo check)
  api/               route handlers (booking, slots, forms, chat, auth, cron, ...)
  sitemap.js, robots.js, not-found.js, globals.css
components/          React components (Header, Footer, BookingForm, ChatWidget, EmergencyModal, cards, ...)
lib/                 server logic: content, auth/RBAC, sessions, crypto, store, audit, forms, notify,
                     automation, slots, chatbot, security
content/             CMS-editable JSON + legal HTML (site settings, photos, doctors, departments, posts, ...)
locales/en.json      UI wording
public/              font, images, Decap CMS (/cms)
middleware.js        per-request CSP nonce
instrumentation.js   starts the automation timer on a normal server
test/                unit tests (node:test) and test/e2e/smoke.js (Playwright)
```

## Docker
```bash
docker build -t clinic .
docker run -p 3000:3000 --env-file .env -v clinic-data:/var/lib/clinic clinic
```
