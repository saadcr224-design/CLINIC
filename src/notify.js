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

// ---------- Message templates used by the booking flow and the automation jobs ----------
const content = require('./content');

function appointmentConfirmed(appt, doctor) {
  const site = content.site();
  const msg = `${site.name}: your appointment ${appt.ref} with ${doctor.name} is confirmed for ${appt.date} at ${appt.time}. Need to change it? Call ${site.phoneDisplay}.`;
  sms(appt.patient.phone, msg);
  if (appt.whatsappReminders) whatsapp(appt.patient.phone, msg);
  email(appt.patient.email, `Appointment confirmed: ${appt.date} at ${appt.time}`, msg);
}

function appointmentReminder(appt, doctor) {
  const site = content.site();
  const msg = `Reminder from ${site.name}: you see ${doctor.name} tomorrow (${appt.date}) at ${appt.time}. Please arrive 15 minutes early with your ID and insurance card.`;
  if (appt.whatsappReminders) whatsapp(appt.patient.phone, msg);
  else sms(appt.patient.phone, msg);
  email(appt.patient.email, `Reminder: appointment tomorrow at ${appt.time}`, msg);
}

function reviewRequest(appt, doctor) {
  const site = content.site();
  const msg = `Thank you for visiting ${doctor.name} at ${site.name}. How did we do? Leave a quick review: ${site.url}/testimonials`;
  if (appt.whatsappReminders) whatsapp(appt.patient.phone, msg);
  email(appt.patient.email, 'How was your visit?', msg);
}

function contactAutoReply(msgRow) {
  const site = content.site();
  email(msgRow.email, `We received your message - ${site.name}`,
    `Hello ${msgRow.name},\n\nThank you for contacting ${site.name}. Our team will reply within one working day.\nFor urgent matters call ${site.phoneDisplay}; in an emergency call ${site.nationalEmergency}.`);
}

Object.assign(module.exports, { appointmentConfirmed, appointmentReminder, reviewRequest, contactAutoReply });
