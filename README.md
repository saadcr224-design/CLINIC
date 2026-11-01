# Wahat Medical Center: clinic website

A clean, fast, photo-led clinic website with online booking, automated patient messaging,
a patient portal, a staff console, a chat assistant, and security controls suited to health data.
Built with Node.js + Express and server-rendered EJS templates. It needs no database server
to try out.

> **Placeholder content.** The clinic name, phone numbers, licence numbers, doctors, reviews,
> stats and accreditation badges are sample data. Replace them with your real details before
> launch, and only show accreditation (CBAHI, JCI, ISO…) that the clinic actually holds.

## Quick start

```bash
npm install
npm start            # http://localhost:3000
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
  can edit doctors, departments, articles, FAQs, reviews, jobs and insurers without a developer.
  The site reloads content files automatically when they change.

**SEO**: per-page titles and descriptions, canonical URLs,
Open Graph, `sitemap.xml`, `robots.txt`, and JSON-LD (`MedicalClinic`,
`Physician`, `MedicalWebPage`, `FAQPage`, `AggregateRating`). Optional Google Analytics 4
(`GA_MEASUREMENT_ID`) and Search Console verification.

**Accessibility**: semantic landmarks, skip link, labelled form controls, visible focus,
focus-trapped modal, `aria-live` status messages, alt text, reduced-motion support, and
readable font sizes and contrast.

**Performance**: server-rendered HTML, gzip compression, a self-hosted font (no third-party font
requests), the hero photo preloaded, responsive `srcset` images with lazy loading below the fold,
one CSS and one small JS file with no frameworks, and long cache headers in production.

**Automation** (`src/automation.js`, runs every 10 minutes inside the app):
- Instant booking confirmation by SMS, WhatsApp and email.
- Reminder 24 hours before each appointment, sent once.
- Review request 2 to 72 hours after a visit is marked *completed*.
- Auto-reply email to every contact-form message, plus staff alerts for new enquiries and ambulance requests.
- Every automated run is recorded in the audit log.

## Security controls

| Area | Implementation |
|---|---|
| Encryption in transit | HTTPS enforced via HSTS (preload) and `upgrade-insecure-requests`. Terminate TLS at your load balancer/WAF. |
| Encryption at rest | All patient records (appointments, messages, users, ambulance requests…) are stored AES-256-GCM encrypted (`src/crypto.js`, `src/store.js`). The key comes from `DATA_KEY`. |
| Access control | Role-based: `patient`, `doctor` (own patients only), `reception`, `admin` (`src/auth.js`). bcrypt password hashes, a fresh session on login, 15-minute idle timeout, signed `__Host-` HttpOnly/Secure/SameSite cookie sessions (no server-side session store needed). |
| Audit logging | Every login, failure, denied access, record view and change is written to a SHA-256 hash-chained log (`src/audit.js`). The admin view verifies the chain and flags tampering. |
| Forms | CSRF tokens, CAPTCHA + honeypot, server-side validation (Saudi ID/Iqama, phone, email…), body size limits, per-IP rate limits, login throttling. |
| Headers | Strict CSP with nonces, `frame-ancestors 'none'`, nosniff, Referrer-Policy, Permissions-Policy, no `X-Powered-By`. |
| Other | Open-redirect protection, no stack traces sent to users, masked phone numbers and emails in logs, masked national IDs in the staff UI. |

### Production checklist
- [ ] Put the site behind a **WAF** (Cloudflare, AWS WAF, or ModSecurity + OWASP CRS) and terminate TLS there.
- [ ] Set `SESSION_SECRET` and `DATA_KEY` from a secret manager/KMS. Back up the key separately from the data.
- [ ] Host patient data **inside the Kingdom** (PDPL data residency). Move `src/store.js` to a managed database
      (PostgreSQL with encryption) before running more than one instance.
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
server.js            app setup, security headers, sessions, routing
src/                 config, content loader, auth/RBAC, crypto, store, audit, notify, automation, slots, chatbot, SEO
src/routes/          pages, api, portal, admin
content/             CMS-editable JSON (site settings, photos, doctors, departments, posts, FAQs, reviews, jobs, insurance)
locales/en.json      UI wording
views/               EJS templates (pages, partials, portal, admin, legal)
public/              CSS, JS, font, images, Decap CMS (/cms)
test/                node:test suite
```

## Deploy to Vercel
The repo is ready for Vercel. `vercel.json` serves `public/` from the CDN and sends every other
request to the Express app through `api/index.js`.

1. In Vercel → **Settings → Git**, make sure the **Production Branch** is the branch that contains this
   code (normally `main`).
2. In **Settings → Environment Variables**, add `SESSION_SECRET`, `DATA_KEY` and `CRON_SECRET`.
   Generate each one with
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
   Without them the site still runs, but sign-ins reset whenever Vercel starts a new instance.
3. Redeploy.

**Important: Vercel has no permanent disk.** Bookings, messages and the audit log are written to `/tmp`,
which Vercel clears whenever it starts a new instance. That's fine for showing the website, but before
real patients book you need one of these:
- host on a server with a persistent disk (Render, Railway, Fly.io, a VPS, or the Docker image below), where
  everything works as-is; or
- connect a database (for example Neon/Vercel Postgres) in place of `src/store.js`.

Vercel's free (Hobby) plan runs cron jobs once a day, so reminders go out daily at 08:00 Riyadh time.
A long-running server sends them every 10 minutes instead.

## Docker
```bash
docker build -t clinic .
docker run -p 3000:3000 --env-file .env -v clinic-data:/var/lib/clinic clinic
```
