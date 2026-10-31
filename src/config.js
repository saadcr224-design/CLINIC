'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const isProd = process.env.NODE_ENV === 'production';
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });

// In development, generate secrets once and keep them in data/ (git-ignored) so
// encrypted data survives restarts. In production every secret must come from the environment.
function secret(name) {
  if (process.env[name]) return process.env[name];
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

module.exports = {
  isProd,
  dataDir,
  port: process.env.PORT !== undefined ? Number(process.env.PORT) : 3000,
  root: path.join(__dirname, '..'),
  sessionSecret: secret('SESSION_SECRET'),
  // 32-byte key (64 hex chars) for AES-256-GCM encryption of patient data at rest.
  dataKey: Buffer.from(secret('DATA_KEY'), 'hex'),
  trustProxy: process.env.TRUST_PROXY !== undefined ? Number(process.env.TRUST_PROXY) : isProd ? 1 : 0,
  gaId: process.env.GA_MEASUREMENT_ID || '',
  gscVerification: process.env.GOOGLE_SITE_VERIFICATION || '',
  sessionIdleMinutes: Number(process.env.SESSION_IDLE_MINUTES) || 15,
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
