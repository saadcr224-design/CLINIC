'use strict';
// Unit tests for the clinic's business logic and security code (lib/). The full browser
// flow is covered by test/e2e/smoke.js against a running site.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'clinic-test-'));

const { encrypt, decrypt } = require('../lib/crypto');
const audit = require('../lib/audit');
const auth = require('../lib/auth');
const chatbot = require('../lib/chatbot');
const forms = require('../lib/forms');
const store = require('../lib/store');
const { availableSlots } = require('../lib/slots');
const content = require('../lib/content');
const { ensureCsrf, checkCsrf, newCaptcha, safeNext, rateLimit } = require('../lib/security');

const ctx = { user: null, ip: '203.0.113.7' };
const answer = (q) => String(q.split('+').reduce((a, b) => a + Number(b), 0));

function nextClinicDay(days) {
  const keys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  for (let i = 1; i < 14; i++) {
    const c = new Date(Date.now() + 3 * 3600e3 + i * 86400e3);
    if (days.includes(keys[c.getUTCDay()])) return c.toISOString().slice(0, 10);
  }
}

test('booking: validates input, checks CAPTCHA, books a slot, blocks double-booking, encrypts at rest', () => {
  const doctor = content.doctor('dr-noura-al-otaibi');
  const date = nextClinicDay(doctor.days);
  const time = availableSlots(doctor, date)[0];
  const session = {};

  let [status, body] = forms.bookAppointment({ session, ctx, body: { captcha: answer(newCaptcha(session)), doctor: doctor.slug, date, time, visitType: 'clinic', name: 'X', phone: 'abc', nationalId: '123', consent: true } });
  assert.equal(status, 422);
  assert.ok(body.errors.name && body.errors.phone && body.errors.nationalId);

  newCaptcha(session);
  [status] = forms.bookAppointment({ session, ctx, body: { captcha: '999' } });
  assert.equal(status, 400, 'wrong CAPTCHA');

  const q = newCaptcha(session);
  [status] = forms.bookAppointment({ session, ctx, body: { captcha: answer(q) } });
  [status] = forms.bookAppointment({ session, ctx, body: { captcha: answer(q) } });
  assert.equal(status, 400, 'a CAPTCHA answer cannot be reused');

  const booking = { doctor: doctor.slug, date, time, visitType: 'clinic', name: 'Sara Ahmed', phone: '0501234567', email: 'patient@demo.local', nationalId: '1012345678', consent: true, insurance: 'Bupa Arabia' };
  [status, body] = forms.bookAppointment({ session, ctx, body: { ...booking, captcha: answer(newCaptcha(session)) } });
  assert.equal(status, 200, JSON.stringify(body));
  assert.match(body.ref, /^WMC-\d{6}$/);
  assert.ok(!availableSlots(doctor, date).includes(time), 'slot removed after booking');

  [status] = forms.bookAppointment({ session, ctx, body: { ...booking, captcha: answer(newCaptcha(session)) } });
  assert.equal(status, 409, 'double booking rejected');

  const raw = fs.readFileSync(path.join(process.env.DATA_DIR, 'appointments.enc'), 'utf8');
  assert.ok(!raw.includes('1012345678'), 'national ID is not stored in plain text');
});

test('ambulance request works without CAPTCHA and ignores a missing location', () => {
  const [status] = forms.ambulance({ ctx, body: { phone: '0559998888', lat: '', lng: '' } });
  assert.equal(status, 200);
  assert.equal(store.all('ambulance').at(-1).location, null);
  assert.equal(forms.ambulance({ ctx, body: { phone: 'nope' } })[0], 422);
});

test('CSRF tokens must match exactly', () => {
  const session = {};
  const token = ensureCsrf(session);
  assert.equal(ensureCsrf(session), token, 'token is stable within a session');
  assert.ok(checkCsrf(session, token));
  assert.ok(!checkCsrf(session, token.slice(0, -1) + 'x'));
  assert.ok(!checkCsrf(session, ''));
  assert.ok(!checkCsrf({}, ''), 'no session token means no access');
});

test('rate limiter blocks after the limit', () => {
  const key = `t:${Math.random()}`;
  for (let i = 0; i < 3; i++) assert.ok(rateLimit(key, 1, 3));
  assert.ok(!rateLimit(key, 1, 3));
});

test('open redirects after login are blocked', () => {
  assert.equal(safeNext('/portal', '/x'), '/portal');
  assert.equal(safeNext('//evil.example', '/portal'), '/portal');
  assert.equal(safeNext('https://evil.example', '/portal'), '/portal');
});

test('RBAC: roles only get their own permissions; passwords verify', async () => {
  await auth.seedDemoUsers();
  const reception = await auth.verify('reception@demo.local', 'Reception#Demo2026');
  assert.ok(reception);
  assert.equal(await auth.verify('reception@demo.local', 'wrong-password'), null);
  assert.ok(auth.can(reception, 'appointments:update'));
  assert.ok(!auth.can(reception, 'audit:read'));
  assert.ok(!auth.can({ role: 'patient' }, 'appointments:read'));
  assert.ok(auth.can({ role: 'admin' }, 'audit:read'));
  assert.ok(!auth.can(null, 'appointments:read'));
});

test('audit log chain verifies and detects tampering', () => {
  audit.log({ user: { email: 'reception@demo.local', role: 'reception' }, ip: '1.2.3.4' }, 'admin.appointments.list');
  assert.equal(audit.verify().ok, true);
  const file = path.join(process.env.DATA_DIR, 'audit.log');
  const original = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, original.replace('reception@demo.local', 'someone@else.local'));
  assert.equal(audit.verify().ok, false);
  fs.writeFileSync(file, original);
});

test('encryption round-trips and detects modification', () => {
  const blob = encrypt('secret');
  assert.equal(decrypt(blob), 'secret');
  const buf = Buffer.from(blob, 'base64');
  buf[buf.length - 1] ^= 1;
  assert.throws(() => decrypt(buf.toString('base64')));
});

test('chatbot flags emergencies and routes common questions', () => {
  assert.equal(chatbot.reply('I have chest pain').urgent, true);
  assert.match(chatbot.reply('what are your opening hours?').reply, /Saturday/);
  assert.ok(chatbot.reply('I need a dentist').actions.some((a) => a.url.includes('dental')));
  assert.ok(chatbot.reply('Do you take Bupa insurance?').actions.some((a) => a.url === '/insurance'));
});

test('automation sends one reminder 24h before and one review request after a visit', () => {
  const automation = require('../lib/automation');
  const now = Date.parse('2026-06-01T09:00:00+03:00');
  const base = { doctor: 'dr-khalid-al-harbi', patient: { name: 'A B', phone: '0500000000', email: 'a@b.co' }, whatsappReminders: true };
  const soon = store.insert('appointments', { ...base, ref: 'T-1', status: 'confirmed', date: '2026-06-02', time: '08:00' });
  const later = store.insert('appointments', { ...base, ref: 'T-2', status: 'confirmed', date: '2026-06-05', time: '08:00' });
  const done = store.insert('appointments', { ...base, ref: 'T-3', status: 'completed', date: '2026-05-31', time: '16:00' });
  assert.deepEqual(automation.run(now), { reminders: 1, reviews: 1 });
  const get = (id) => store.all('appointments').find((a) => a.id === id);
  assert.ok(get(soon.id).reminderSentAt);
  assert.ok(!get(later.id).reminderSentAt);
  assert.ok(get(done.id).reviewRequestedAt);
  assert.deepEqual(automation.run(now), { reminders: 0, reviews: 0 }, 'nothing is sent twice');
});

test('every photo slot has an image URL', () => {
  const site = content.site();
  for (const [k, v] of Object.entries(site.images)) assert.match(v, /^https:\/\//, k);
  assert.ok(site.fallbackImages.length >= 3 && site.fallbackPortraits.length >= 3);
});
