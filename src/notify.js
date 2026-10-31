'use strict';
// Notification adapters: WhatsApp (Meta Cloud API), SMS (Twilio), email (webhook to your
// mail provider, e.g. SendGrid/SES via a small relay). Without credentials, messages are
// logged with the recipient masked so nothing sensitive lands in logs.
const { notify } = require('./config');
const { mask } = require('./security');

async function post(url, opts) {
  try {
    const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(8000) });
    if (!res.ok) console.error(`[notify] ${url} -> HTTP ${res.status}`);
  } catch (err) {
    console.error(`[notify] ${url} failed: ${err.message}`);
  }
}

const digits = (phone) => phone.replace(/\D/g, '').replace(/^0/, '966');

async function whatsapp(phone, text) {
  if (!notify.whatsappToken) return console.log(`[notify:whatsapp] to ${mask(phone)}: ${text}`);
  await post(`https://graph.facebook.com/v20.0/${notify.whatsappPhoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${notify.whatsappToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: digits(phone), type: 'text', text: { body: text } }),
  });
}

async function sms(phone, text) {
  if (!notify.twilioSid) return console.log(`[notify:sms] to ${mask(phone)}: ${text}`);
  await post(`https://api.twilio.com/2010-04-01/Accounts/${notify.twilioSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${notify.twilioSid}:${notify.twilioToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: '+' + digits(phone), From: notify.twilioFrom, Body: text }),
  });
}

async function email(to, subject, text) {
  if (!to) return;
  if (!notify.emailWebhook) return console.log(`[notify:email] to ${mask(to, 8)}: ${subject}`);
  await post(notify.emailWebhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, text }),
  });
}

async function staff(text) {
  if (!notify.staffWebhook) return console.log(`[notify:staff] ${text}`);
  await post(notify.staffWebhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
}

module.exports = { whatsapp, sms, email, staff };
