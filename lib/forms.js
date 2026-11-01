'use strict';
// Business logic behind each public form, shared by the API routes (and covered by tests).
const crypto = require('crypto');
const content = require('./content');
const store = require('./store');
const audit = require('./audit');
const notify = require('./notify');
const { availableSlots } = require('./slots');
const { validate, checkBot, newCaptcha, mask } = require('./security');
const { t } = require('./text');

const FEES = { cardiology: 350, dental: 250, pediatrics: 250, orthopedics: 350, dermatology: 300, 'obstetrics-gynecology': 350, 'internal-medicine': 300, ophthalmology: 300 };

// Each handler returns [httpStatus, responseBody].
const bad = (session, errors) => [422, { ok: false, error: 'Please check the highlighted fields.', errors, captcha: newCaptcha(session) }];

function botGuard(session, body) {
  const problem = checkBot(session, body);
  if (!problem) return null;
  return [400, { ok: false, error: problem === 'captcha' ? 'Security check answer is incorrect.' : 'Rejected', field: 'captcha', captcha: newCaptcha(session) }];
}

function bookAppointment({ session, body, ctx }) {
  const blocked = botGuard(session, body);
  if (blocked) return blocked;
  const { values: v, errors, ok } = validate(body, {
    doctor: { rule: 'slug', required: true },
    date: { rule: 'date', required: true },
    time: { rule: 'time', required: true },
    visitType: { oneOf: ['clinic', 'video'], required: true },
    name: { rule: 'name', required: true, max: 80 },
    phone: { rule: 'phone', required: true, max: 20 },
    email: { rule: 'email', max: 254 },
    nationalId: { rule: 'nationalId', required: true, max: 10 },
    dob: { rule: 'date' },
    reason: { max: 500 },
    insurance: { oneOf: ['self-pay', ...content.insurance().providers] },
  });
  if (body.consent !== true) errors.consent = 'required';
  if (!ok || errors.consent) return bad(session, errors);

  const doctor = content.doctor(v.doctor);
  if (!doctor) return bad(session, { doctor: 'invalid' });
  if (!availableSlots(doctor, v.date).includes(v.time)) {
    return [409, { ok: false, error: 'That time was just taken. Please choose another slot.', field: 'time', captcha: newCaptcha(session) }];
  }
  const appt = store.insert('appointments', {
    ref: 'WMC-' + crypto.randomInt(100000, 999999),
    status: 'confirmed',
    doctor: doctor.slug,
    department: doctor.department,
    date: v.date,
    time: v.time,
    visitType: v.visitType,
    patient: { name: v.name, phone: v.phone, email: v.email.toLowerCase(), nationalId: v.nationalId, dob: v.dob },
    reason: v.reason,
    insurance: v.insurance || 'self-pay',
    whatsappReminders: body.reminders === true,
  });
  audit.log(ctx, 'appointment.create', appt.ref, { doctor: doctor.slug, date: v.date });
  notify.appointmentConfirmed(appt, doctor);
  return [200, { ok: true, ref: appt.ref, doctor: doctor.name, date: v.date, time: v.time, fee: FEES[doctor.department] || 300, captcha: newCaptcha(session) }];
}

function contactMessage({ session, body, ctx }) {
  const blocked = botGuard(session, body);
  if (blocked) return blocked;
  const { values, errors, ok } = validate(body, {
    name: { rule: 'name', required: true, max: 80 },
    phone: { rule: 'phone', max: 20 },
    email: { rule: 'email', required: true, max: 254 },
    subject: { oneOf: ['general', 'appointment', 'billing', 'feedback'], required: true },
    message: { required: true, max: 2000 },
  });
  if (!ok) return bad(session, errors);
  const row = store.insert('messages', { type: 'contact', ...values, status: 'new' });
  audit.log(ctx, 'contact.create', row.id);
  notify.staff(`New ${values.subject} enquiry from ${values.name}`);
  notify.contactAutoReply(values);
  return [200, { ok: true, message: t('contact.sent'), captcha: newCaptcha(session) }];
}

function subscribe({ body, ctx }) {
  const { values, errors, ok } = validate(body, { email: { rule: 'email', required: true, max: 254 } });
  if (!ok || body.website) return [422, { ok: false, error: 'Please enter a valid email.', errors }];
  const email = values.email.toLowerCase();
  if (!store.find('subscribers', (s) => s.email === email).length) {
    store.insert('subscribers', { email, confirmed: false });
    audit.log(ctx, 'newsletter.subscribe', mask(email, 8));
  }
  // Same response either way, so the endpoint can't be used to check who is subscribed.
  return [200, { ok: true, message: t('newsletter.thanks') }];
}

function review({ session, body, ctx }) {
  const blocked = botGuard(session, body);
  if (blocked) return blocked;
  const { values, errors, ok } = validate(body, {
    name: { rule: 'name', required: true, max: 80 },
    rating: { oneOf: ['1', '2', '3', '4', '5'], required: true },
    department: { oneOf: content.departments().map((d) => d.slug) },
    text: { required: true, max: 1000 },
  });
  if (!ok) return bad(session, errors);
  store.insert('reviews', { ...values, rating: Number(values.rating), status: 'pending' });
  audit.log(ctx, 'review.create');
  return [200, { ok: true, message: t('testimonials.thanks'), captcha: newCaptcha(session) }];
}

// No CAPTCHA here: speed matters in an emergency. Rate-limited instead.
function ambulance({ body, ctx }) {
  if (body.website) return [400, { ok: false, error: 'Rejected' }];
  const { values, errors, ok } = validate(body, {
    name: { rule: 'name', max: 80 },
    phone: { rule: 'phone', required: true, max: 20 },
    notes: { max: 300 },
  });
  if (!ok) return [422, { ok: false, error: 'Please enter a valid mobile number.', errors }];
  const hasGeo = String(body.lat ?? '').trim() !== '' && String(body.lng ?? '').trim() !== '';
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const location = hasGeo && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
  const row = store.insert('ambulance', { ...values, location, status: 'new' });
  audit.log(ctx, 'ambulance.request', row.id);
  notify.staff(`🚑 AMBULANCE REQUEST: call ${values.phone}` + (location ? ` · https://maps.google.com/?q=${location.lat},${location.lng}` : ' · no location shared'));
  return [200, { ok: true, message: t('emergency.sent') }];
}

function jobApplication({ session, body, ctx }) {
  const blocked = botGuard(session, body);
  if (blocked) return blocked;
  const { values, errors, ok } = validate(body, {
    job: { oneOf: content.jobs().map((j) => j.id).concat('general'), required: true },
    name: { rule: 'name', required: true, max: 80 },
    email: { rule: 'email', required: true, max: 254 },
    phone: { rule: 'phone', required: true, max: 20 },
    cv: { rule: 'url', required: true, max: 300 },
    message: { max: 1000 },
  });
  if (!ok) return bad(session, errors);
  store.insert('applications', { ...values, status: 'new' });
  audit.log(ctx, 'careers.apply', values.job);
  return [200, { ok: true, message: t('careers.applied'), captcha: newCaptcha(session) }];
}

module.exports = { bookAppointment, contactMessage, subscribe, review, ambulance, jobApplication, FEES };
