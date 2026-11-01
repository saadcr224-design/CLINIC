'use strict';
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const session = require('express-session');

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
app.use(
  session({
    name: config.isProd ? '__Host-sid' : 'sid',
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true, // idle timeout: each request extends the session
    cookie: { httpOnly: true, sameSite: 'lax', secure: config.isProd, maxAge: config.sessionIdleMinutes * 60 * 1000 },
    // NOTE: the default MemoryStore is for single-instance deployments only. Use a shared
    // store (e.g. connect-redis) when running more than one instance.
  })
);

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

module.exports = { app, start };
