'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const isProd = process.env.NODE_ENV === 'production';
const onVercel = !!process.env.VERCEL;
// Vercel's filesystem is read-only except /tmp, which is temporary (cleared between cold starts).
const dataDir = process.env.DATA_DIR || (onVercel ? '/tmp/clinic-data' : path.join(process.cwd(), 'data'));
fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });

// In development, generate secrets once and keep them in data/ (git-ignored) so
// encrypted data survives restarts. In production every secret must come from the environment.
const ephemeral = {};
function secret(name) {
  if (process.env[name]) return process.env[name];
  if (onVercel) {
    // Keep the site up instead of crashing, but sign-ins reset on every cold start and
    // nothing persists. Set the variable in Vercel → Settings → Environment Variables.
    if (!ephemeral[name]) {
      ephemeral[name] = crypto.randomBytes(32).toString('hex');
      console.error(`[config] ${name} is not set on Vercel; using a temporary value. Set it in the project's environment variables.`);
    }
    return ephemeral[name];
  }
  if (isProd) throw new Error(`${name} must be set in production`);
  const devFile = path.join(dataDir, '.dev-secrets.json');
  let dev = {};
  try { dev = JSON.parse(fs.readFileSync(devFile, 'utf8')); } catch { /* first run */ }
  if (!dev[name]) {
    dev[name] = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(devFile, JSON.stringify(dev), { mode: 0o600 });
    console.warn(`[config] ${name} not set; generated a development value in ${devFile}`);
  }
  return dev[name];
}

const config = {
  isProd,
  onVercel,
  dataDir,
  gaId: process.env.GA_MEASUREMENT_ID || '',
  gscVerification: process.env.GOOGLE_SITE_VERIFICATION || '',
  sessionIdleMinutes: Number(process.env.SESSION_IDLE_MINUTES) || 15,
  // Demo accounts are always on in development; set DEMO_ACCOUNTS=true to allow them on a demo deployment.
  demoAccounts: !isProd || process.env.DEMO_ACCOUNTS === 'true',
  notify: {
    whatsappToken: process.env.WHATSAPP_TOKEN || '',
    whatsappPhoneId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    twilioSid: process.env.TWILIO_ACCOUNT_SID || '',
    twilioToken: process.env.TWILIO_AUTH_TOKEN || '',
    twilioFrom: process.env.TWILIO_FROM || '',
    emailWebhook: process.env.EMAIL_WEBHOOK_URL || '',
    staffWebhook: process.env.STAFF_ALERT_WEBHOOK_URL || '',
  },
};

// Secrets are read on first use, not at import, so `next build` works without them.
Object.defineProperties(config, {
  sessionSecret: { enumerable: true, get: () => secret('SESSION_SECRET') },
  // 32-byte key (64 hex chars) for AES-256-GCM encryption of patient data at rest.
  dataKey: { enumerable: true, get: () => Buffer.from(secret('DATA_KEY'), 'hex') },
});

module.exports = config;
