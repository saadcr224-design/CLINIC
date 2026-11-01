'use strict';
// End-to-end API tests against a real server on a random port with an isolated data dir.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'clinic-test-'));
process.env.PORT = '0';

const { start } = require('../server');
const { encrypt, decrypt } = require('../src/crypto');
const audit = require('../src/audit');
const chatbot = require('../src/chatbot');

let server;
let base;

before(async () => {
  server = await start();
  await new Promise((r, j) => (server.listening ? r() : (server.once('listening', r), server.once('error', j))));
  base = `http://localhost:${server.address().port}`;
});
after(() => server.close());

// Minimal cookie-keeping browser.
function client() {
  let cookie = '';
  return async function req(p, opts = {}) {
    const res = await fetch(base + p, { redirect: 'manual', ...opts, headers: { ...(opts.headers || {}), cookie } });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return res;
  };
}

async function openForm(req, page) {
  const html = await (await req(page)).text();
  const cfg = JSON.parse(html.match(/<script type="application\/json" id="app-config">(.*?)<\/script>/s)[1]);
  const m = html.match(/class="js-captcha-q" dir="ltr">(\d) \+ (\d)</);
  return { csrf: cfg.csrf, captcha: m ? String(Number(m[1]) + Number(m[2])) : null, html };
}

const post = (req, p, csrf, body) =>
  req(p, { method: 'POST', headers: { 'content-type': 'application/json', 'x-csrf-token': csrf }, body: JSON.stringify(body) });

function nextClinicDay(doctorDays) {
  const keys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const d = new Date(Date.now() + 3 * 3600e3);
  for (let i = 1; i < 14; i++) {
    const c = new Date(d.getTime() + i * 86400e3);
    if (doctorDays.includes(keys[c.getUTCDay()])) return c.toISOString().slice(0, 10);
  }
}

test('public pages render, every page has a photo header, old /ar links redirect', async () => {
  const req = client();
  for (const p of ['/', '/about', '/doctors', '/doctors/dr-khalid-al-harbi', '/departments', '/departments/cardiology', '/book', '/contact', '/blog',
    '/blog/know-your-blood-pressure-numbers', '/testimonials', '/faq', '/careers', '/insurance', '/privacy', '/terms', '/data-protection', '/portal/login']) {
    const res = await req(p);
    assert.equal(res.status, 200, p);
    const html = await res.text();
    assert.match(html, /class="(hero-bg|page-hero-bg)" src="https:\/\/images\.unsplash\.com\//, `${p} has a photo background`);
    assert.doesNotMatch(html, /undefined|\[object Object\]/, `${p} has no template gaps`);
  }
  const old = await req('/ar/doctors');
  assert.equal(old.status, 301);
  assert.equal(old.headers.get('location'), '/doctors');
  assert.equal((await req('/does-not-exist')).status, 404);
});

test('security headers are set', async () => {
  const res = await fetch(base + '/');
  assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
  assert.match(res.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-powered-by'), null);
});

test('POST without CSRF token is rejected', async () => {
  const res = await fetch(base + '/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.equal(res.status, 403);
});

test('booking: validates input, books a slot, blocks double-booking', async () => {
  const req = client();
  const slug = 'dr-noura-al-otaibi';
  const date = nextClinicDay(['sat', 'sun', 'mon', 'tue', 'wed', 'thu']);
  const slots = await (await req(`/api/slots?doctor=${slug}&date=${date}`)).json();
  const time = slots.doctors[0].slots[0];

  let f = await openForm(req, '/book');
  const bad = await post(req, '/api/appointments', f.csrf, { doctor: slug, date, time, visitType: 'clinic', name: 'X', phone: 'abc', nationalId: '123', consent: true, captcha: f.captcha });
  assert.equal(bad.status, 422);
  const badBody = await bad.json();
  assert.ok(badBody.errors.name && badBody.errors.phone && badBody.errors.nationalId);

  f = await openForm(req, '/book');
  const wrongCaptcha = await post(req, '/api/appointments', f.csrf, { captcha: '999' });
  assert.equal(wrongCaptcha.status, 400);

  const booking = { doctor: slug, date, time, visitType: 'clinic', name: 'Sara Ahmed', phone: '0501234567', email: 'patient@demo.local', nationalId: '1012345678', consent: true, insurance: 'Bupa Arabia' };
  f = await openForm(req, '/book');
  const ok = await post(req, '/api/appointments', f.csrf, { ...booking, captcha: f.captcha });
  const okBody = await ok.json();
  assert.equal(ok.status, 200, JSON.stringify(okBody));
  assert.match(okBody.ref, /^WMC-\d{6}$/);

  const after = await (await req(`/api/slots?doctor=${slug}&date=${date}`)).json();
  assert.ok(!after.doctors[0].slots.includes(time), 'slot removed after booking');

  f = await openForm(req, '/book');
  const dup = await post(req, '/api/appointments', f.csrf, { ...booking, captcha: f.captcha });
  assert.equal(dup.status, 409);

  // Data at rest is encrypted: the patient's ID must not appear in the file.
  const raw = fs.readFileSync(path.join(process.env.DATA_DIR, 'appointments.enc'), 'utf8');
  assert.ok(!raw.includes('1012345678'));
});

test('RBAC: patient cannot open admin; reception can; audit chain verifies', async () => {
  const patient = client();
  let f = await openForm(patient, '/portal/login');
  let res = await patient('/portal/login', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ _csrf: f.csrf, email: 'patient@demo.local', password: 'Patient#Demo2026' }) });
  assert.equal(res.status, 302);
  const dash = await (await patient('/portal')).text();
  assert.match(dash, /Sara Ahmed/);
  assert.equal((await patient('/admin')).status, 403);

  const staff = client();
  f = await openForm(staff, '/portal/login');
  res = await staff('/portal/login', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ _csrf: f.csrf, email: 'reception@demo.local', password: 'wrong-password' }) });
  assert.equal(res.status, 401);
  res = await staff('/portal/login', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ _csrf: f.csrf, email: 'reception@demo.local', password: 'Reception#Demo2026' }) });
  assert.equal(res.headers.get('location'), '/admin');
  const admin = await (await staff('/admin')).text();
  assert.match(admin, /WMC-\d{6}/);
  assert.equal((await staff('/admin/audit')).status, 403, 'reception cannot read audit log');

  assert.equal(audit.verify().ok, true);
  const entries = audit.readEntries();
  assert.ok(entries.some((e) => e.action === 'admin.appointments.list' && e.actor === 'reception@demo.local'));
});

test('audit log detects tampering', () => {
  const file = path.join(process.env.DATA_DIR, 'audit.log');
  const original = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, original.replace('reception@demo.local', 'someone@else.local'));
  assert.equal(audit.verify().ok, false);
  fs.writeFileSync(file, original);
});

test('open redirect after login is blocked', async () => {
  const req = client();
  const f = await openForm(req, '/portal/login');
  const res = await req('/portal/login', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ _csrf: f.csrf, email: 'patient@demo.local', password: 'Patient#Demo2026', next: '//evil.example' }) });
  assert.equal(res.headers.get('location'), '/portal');
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
  const store = require('../src/store');
  const automation = require('../src/automation');
  const now = Date.parse('2026-06-01T09:00:00+03:00');
  const base = { doctor: 'dr-khalid-al-harbi', patient: { name: 'A B', phone: '0500000000', email: 'a@b.co' }, whatsappReminders: true };
  const soon = store.insert('appointments', { ...base, ref: 'T-1', status: 'confirmed', date: '2026-06-02', time: '08:00' });
  const later = store.insert('appointments', { ...base, ref: 'T-2', status: 'confirmed', date: '2026-06-05', time: '08:00' });
  const done = store.insert('appointments', { ...base, ref: 'T-3', status: 'completed', date: '2026-05-31', time: '16:00' });
  const first = automation.run(now);
  assert.deepEqual(first, { reminders: 1, reviews: 1 });
  assert.ok(store.all('appointments').find((a) => a.id === soon.id).reminderSentAt);
  assert.ok(!store.all('appointments').find((a) => a.id === later.id).reminderSentAt);
  assert.ok(store.all('appointments').find((a) => a.id === done.id).reviewRequestedAt);
  assert.deepEqual(automation.run(now), { reminders: 0, reviews: 0 }, 'nothing is sent twice');
});
