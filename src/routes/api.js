'use strict';
const express = require('express');
const crypto = require('crypto');
const content = require('../content');
const store = require('../store');
const audit = require('../audit');
const notify = require('../notify');
const { availableSlots, riyadhNow } = require('../slots');
const { validate, checkBot, limiter, newCaptcha, clean, mask } = require('../security');
const { t } = require('../i18n');
const chatbot = require('../chatbot');

const router = express.Router();

const lang = (req) => (req.body && req.body.lang === 'ar') || req.query.lang === 'ar' ? 'ar' : 'en';
const fail = (res, status, error, extra = {}) => res.status(status).json({ ok: false, error, ...extra });

// Every failed bot check issues a fresh challenge so the user can retry without reloading.
function botGuard(req, res) {
  const problem = checkBot(req);
  if (!problem) return false;
  const message = problem === 'captcha' ? (lang(req) === 'ar' ? 'إجابة التحقق الأمني غير صحيحة.' : 'Security check answer is incorrect.') : 'Rejected';
  fail(res, 400, message, { field: 'captcha', captcha: newCaptcha(req) });
  return true;
}

function badInput(req, res, errors) {
  fail(res, 422, lang(req) === 'ar' ? 'يرجى التحقق من الحقول المحددة.' : 'Please check the highlighted fields.', { errors, captcha: newCaptcha(req) });
}

const formLimiter = limiter(15, 10);

// ---------- Doctors & slots ----------
router.get('/doctors', (req, res) => {
  const dept = String(req.query.dept || '');
  res.json(
    content
      .doctors()
      .filter((d) => !dept || d.department === dept)
      .map((d) => ({ slug: d.slug, name: d.name, title: d.title, department: d.department, days: d.days, photo: d.photo }))
  );
});

router.get('/slots', limiter(1, 60), (req, res) => {
  const date = String(req.query.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(res, 400, 'Invalid date');
  const slug = String(req.query.doctor || '');
  const dept = String(req.query.dept || '');
  const doctors = slug ? [content.doctor(slug)].filter(Boolean) : content.doctors().filter((d) => !dept || d.department === dept);
  const result = doctors
    .map((d) => ({ doctor: d.slug, name: d.name, slots: availableSlots(d, date) }))
    .filter((d) => d.slots.length);
  res.json({ ok: true, date, doctors: result });
});

// ---------- Appointment booking ----------
const FEES = { cardiology: 350, dental: 250, pediatrics: 250, orthopedics: 350, dermatology: 300, 'obstetrics-gynecology': 350, 'internal-medicine': 300, ophthalmology: 300 };

router.post('/appointments', formLimiter, async (req, res) => {
  if (botGuard(req, res)) return;
  const providers = content.insurance().providers;
  const { values: v, errors, ok } = validate(req.body, {
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
    insurance: { oneOf: ['self-pay', ...providers] },
  });
  if (req.body.consent !== true && req.body.consent !== 'on') errors.consent = 'required';
  if (!ok || errors.consent) return badInput(req, res, errors);

  const doctor = content.doctor(v.doctor);
  if (!doctor) return badInput(req, res, { doctor: 'invalid' });
  if (!availableSlots(doctor, v.date).includes(v.time)) {
    return fail(res, 409, lang(req) === 'ar' ? 'هذا الوقت لم يعد متاحاً. يرجى اختيار وقت آخر.' : 'That time was just taken. Please choose another slot.', {
      field: 'time',
      captcha: newCaptcha(req),
    });
  }

  const ref = 'WMC-' + crypto.randomInt(100000, 999999);
  const appt = store.insert('appointments', {
    ref,
    status: 'confirmed',
    doctor: doctor.slug,
    department: doctor.department,
    date: v.date,
    time: v.time,
    visitType: v.visitType,
    patient: { name: v.name, phone: v.phone, email: v.email.toLowerCase(), nationalId: v.nationalId, dob: v.dob },
    reason: v.reason,
    insurance: v.insurance || 'self-pay',
    whatsappReminders: req.body.reminders === true || req.body.reminders === 'on',
    lang: lang(req),
  });
  audit.log(req, 'appointment.create', appt.ref, { doctor: doctor.slug, date: v.date });

  const L = lang(req);
  const msg =
    L === 'ar'
      ? `تم تأكيد موعدك ${ref} مع ${doctor.name.ar} يوم ${v.date} الساعة ${v.time}. ${content.site().name.ar}`
      : `Your appointment ${ref} with ${doctor.name.en} is confirmed for ${v.date} at ${v.time}. ${content.site().name.en}`;
  notify.sms(v.phone, msg);
  if (appt.whatsappReminders) notify.whatsapp(v.phone, msg);
  notify.email(v.email, L === 'ar' ? 'تأكيد الموعد' : 'Appointment confirmed', msg);

  res.json({ ok: true, ref, doctor: doctor.name[L], date: v.date, time: v.time, fee: FEES[doctor.department] || 300, captcha: newCaptcha(req) });
});

// ---------- Contact form ----------
router.post('/contact', formLimiter, (req, res) => {
  if (botGuard(req, res)) return;
  const { values, errors, ok } = validate(req.body, {
    name: { rule: 'name', required: true, max: 80 },
    phone: { rule: 'phone', max: 20 },
    email: { rule: 'email', required: true, max: 254 },
    subject: { oneOf: ['general', 'appointment', 'billing', 'feedback'], required: true },
    message: { required: true, max: 2000 },
  });
  if (!ok) return badInput(req, res, errors);
  const row = store.insert('messages', { type: 'contact', ...values, status: 'new' });
  audit.log(req, 'contact.create', row.id);
  notify.staff(`New ${values.subject} enquiry from ${values.name}`);
  res.json({ ok: true, message: t(lang(req), 'contact.sent'), captcha: newCaptcha(req) });
});

// ---------- Newsletter ----------
router.post('/newsletter', formLimiter, (req, res) => {
  const { values, errors, ok } = validate(req.body, { email: { rule: 'email', required: true, max: 254 } });
  if (!ok || req.body.website) return fail(res, 422, lang(req) === 'ar' ? 'بريد إلكتروني غير صالح.' : 'Please enter a valid email.', { errors });
  const email = values.email.toLowerCase();
  if (!store.find('subscribers', (s) => s.email === email).length) {
    store.insert('subscribers', { email, lang: lang(req), confirmed: false });
    audit.log(req, 'newsletter.subscribe', mask(email, 8));
  }
  // Same response either way, so the endpoint can't be used to check who is subscribed.
  res.json({ ok: true, message: t(lang(req), 'newsletter.thanks') });
});

// ---------- Reviews (moderated) ----------
router.post('/reviews', formLimiter, (req, res) => {
  if (botGuard(req, res)) return;
  const { values, errors, ok } = validate(req.body, {
    name: { rule: 'name', required: true, max: 80 },
    rating: { oneOf: ['1', '2', '3', '4', '5'], required: true },
    department: { oneOf: content.departments().map((d) => d.slug) },
    text: { required: true, max: 1000 },
  });
  if (!ok) return badInput(req, res, errors);
  store.insert('reviews', { ...values, rating: Number(values.rating), status: 'pending' });
  audit.log(req, 'review.create');
  res.json({ ok: true, message: t(lang(req), 'testimonials.thanks'), captcha: newCaptcha(req) });
});

// ---------- Ambulance request (no CAPTCHA: speed matters; rate-limited instead) ----------
router.post('/ambulance', limiter(10, 5), (req, res) => {
  if (req.body.website) return fail(res, 400, 'Rejected');
  const { values, errors, ok } = validate(req.body, {
    name: { rule: 'name', max: 80 },
    phone: { rule: 'phone', required: true, max: 20 },
    notes: { max: 300 },
  });
  if (!ok) return fail(res, 422, lang(req) === 'ar' ? 'يرجى إدخال رقم جوال صحيح.' : 'Please enter a valid mobile number.', { errors });
  const hasGeo = String(req.body.lat ?? '').trim() !== '' && String(req.body.lng ?? '').trim() !== '';
  const lat = Number(req.body.lat);
  const lng = Number(req.body.lng);
  const location = hasGeo && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
  const row = store.insert('ambulance', { ...values, location, status: 'new' });
  audit.log(req, 'ambulance.request', row.id);
  notify.staff(
    `🚑 AMBULANCE REQUEST: call ${values.phone}` + (location ? ` · https://maps.google.com/?q=${location.lat},${location.lng}` : ' · no location shared')
  );
  res.json({ ok: true, message: t(lang(req), 'emergency.sent') });
});

// ---------- Careers ----------
router.post('/careers', formLimiter, (req, res) => {
  if (botGuard(req, res)) return;
  const { values, errors, ok } = validate(req.body, {
    job: { oneOf: content.jobs().map((j) => j.id).concat('general'), required: true },
    name: { rule: 'name', required: true, max: 80 },
    email: { rule: 'email', required: true, max: 254 },
    phone: { rule: 'phone', required: true, max: 20 },
    cv: { rule: 'url', required: true, max: 300 },
    message: { max: 1000 },
  });
  if (!ok) return badInput(req, res, errors);
  store.insert('applications', { ...values, status: 'new' });
  audit.log(req, 'careers.apply', values.job);
  res.json({ ok: true, message: t(lang(req), 'careers.applied'), captcha: newCaptcha(req) });
});

// ---------- Chatbot ----------
router.post('/chat', limiter(1, 20), (req, res) => {
  const text = clean(req.body.message, 300);
  if (!text) return fail(res, 400, 'Empty message');
  res.json({ ok: true, ...chatbot.reply(text, lang(req)) });
});

router.get('/health', (req, res) => res.json({ ok: true, time: riyadhNow() }));

module.exports = router;
