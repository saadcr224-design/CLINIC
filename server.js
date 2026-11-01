'use strict';
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cookieSession = require('cookie-session');

const config = require('./src/config');
const content = require('./src/content');
const i18n = require('./src/i18n');
const { csrf } = require('./src/security');
const auth = require('./src/auth');
const { router: pages, notFound } = require('./src/routes/pages');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', config.trustProxy);
app.disable('x-powered-by');

// ---------- Security headers ----------
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`, 'https://www.googletagmanager.com'],
  styleSrc: ["'self'"],
  fontSrc: ["'self'"],
  imgSrc: ["'self'", 'data:', 'https://images.unsplash.com', 'https://*.google-analytics.com', 'https://*.googletagmanager.com'],
  connectSrc: ["'self'", 'https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://*.googletagmanager.com'],
  frameSrc: ['https://www.google.com', 'https://maps.google.com', 'https://www.youtube-nocookie.com'],
  formAction: ["'self'"],
  frameAncestors: ["'none'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  upgradeInsecureRequests: config.isProd ? [] : null,
};

// The Decap CMS editor loads from a CDN and talks to the GitHub API; give only /cms that wider policy.
const cmsHelmet = helmet({
  contentSecurityPolicy: {
    directives: {
      ...cspDirectives,
      scriptSrc: ["'self'", "'unsafe-eval'", 'https://unpkg.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
      connectSrc: ["'self'", 'https://api.github.com', 'https://unpkg.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      frameSrc: ["'self'"],
      frameAncestors: ["'self'"],
    },
  },
});
const siteHelmet = helmet({
  contentSecurityPolicy: { directives: cspDirectives },
  strictTransportSecurity: { maxAge: 63072000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false, // allow embedding third-party images & Google Maps
});
app.use((req, res, next) => (req.path.startsWith('/cms') ? cmsHelmet : siteHelmet)(req, res, next));
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=(self)');
  next();
});

app.use(compression());

// ---------- Static files (long cache for versioned assets) ----------
app.use(express.static(path.join(__dirname, 'public'), { maxAge: config.isProd ? '7d' : 0, index: ['index.html'] }));

// ---------- Sessions ----------
// Signed cookie sessions: they hold only small values (CSRF token, CAPTCHA hash, signed-in
// user) and work across serverless instances (Vercel) and multiple servers without a shared store.
app.use(
  cookieSession({
    name: config.isProd ? '__Host-sid' : 'sid',
    keys: [config.sessionSecret],
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    maxAge: 12 * 60 * 60 * 1000,
  })
);
// Idle timeout: a signed-in user is signed out after SESSION_IDLE_MINUTES without a request.
app.use((req, res, next) => {
  const minute = Math.floor(Date.now() / 60000);
  if (req.session.user && minute - (req.session.seen || 0) > config.sessionIdleMinutes) delete req.session.user;
  if (req.session.seen !== minute) req.session.seen = minute; // refreshes the cookie at most once a minute
  next();
});

app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
app.use(csrf);

// ---------- Shared view data ----------
app.use((req, res, next) => {
  res.locals.site = content.site();
  res.locals.departments = content.departments();
  res.locals.gaId = config.gaId;
  res.locals.gscVerification = config.gscVerification;
  res.locals.user = req.session.user || null;
  res.locals.title = null;
  res.locals.description = null;
  res.locals.ogImage = null;
  res.locals.ogType = 'website';
  res.locals.noindex = false;
  res.locals.jsonLd = null;
  res.locals.assetVersion = ASSET_VERSION;
  // Responsive srcset for CDN images that accept a w= parameter (e.g. Unsplash/imgix).
  res.locals.srcset = (src, widths = [400, 800, 1200]) =>
    /[?&]w=\d+/.test(src) ? widths.map((w) => `${src.replace(/([?&])w=\d+/, `$1w=${w}`).replace(/&h=\d+/, '')} ${w}w`).join(', ') : '';
  next();
});
const ASSET_VERSION = Date.now().toString(36);

// ---------- Routes ----------
app.use(require('./src/seo'));
app.use('/api', require('./src/routes/api'));
app.use('/admin', i18n.middleware, require('./src/routes/admin'));
// The site used to have an Arabic version under /ar; keep old links working.
app.get(/^\/ar(\/.*)?$/, (req, res) => res.redirect(301, req.params[0] || '/'));
app.use(i18n.middleware, require('./src/routes/portal'), pages, notFound);

// ---------- Errors: never leak stack traces to users ----------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith('/api')) return res.status(500).json({ ok: false, error: 'Server error' });
  i18n.middleware(req, res, () => res.status(500).render('pages/error', { title: 'Error', status: 500, message: res.locals.t('common.error') }));
});

async function start() {
  if (!config.isProd) await auth.seedDemoUsers();
  require('./src/automation').start();
  return app.listen(config.port, () => console.log(`Clinic site running on http://localhost:${config.port}`));
}

if (require.main === module) start();

// Export the app itself so hosts that import it directly (Vercel, tests) can use it.
module.exports = app;
module.exports.app = app;
module.exports.start = start;
