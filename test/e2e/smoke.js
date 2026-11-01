// Browser smoke test against a running site: `BASE_URL=http://localhost:3000 npm run test:e2e`.
// Needs Playwright and demo accounts enabled (development, or DEMO_ACCOUNTS=true).
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const SHOTS = process.env.SHOTS_DIR;
const problems = [];
const ok = (msg) => console.log('✔', msg);
const ignorable = (t) => /images\.unsplash\.com|ERR_TUNNEL|ERR_NAME|net::|Failed to load resource/i.test(t);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !ignorable(m.text())) problems.push(`console: ${m.text()}`); });

  // Every page renders without horizontal overflow, on desktop and phone widths.
  for (const w of [1366, 390]) {
    await page.setViewportSize({ width: w, height: 900 });
    for (const p of ['/', '/about', '/doctors', '/doctors/dr-khalid-al-harbi', '/departments', '/departments/cardiology', '/book', '/contact', '/blog', '/blog/know-your-blood-pressure-numbers', '/testimonials', '/faq', '/careers', '/insurance', '/privacy', '/portal/login']) {
      const res = await page.goto(BASE + p, { waitUntil: 'load' });
      if (res.status() !== 200) problems.push(`${p} returned ${res.status()}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 0) problems.push(`${p} @${w}px overflows by ${overflow}px`);
    }
  }
  ok('all pages render at 1366px and 390px');
  await page.setViewportSize({ width: 1366, height: 900 });

  // Booking: preselected doctor → pick a slot → fill details → confirm.
  await page.goto(`${BASE}/book?doctor=dr-ahmed-siddiqui`);
  await page.waitForFunction(() => document.querySelector('#b-dept').value === 'internal-medicine');
  for (let i = 1; i < 10 && !(await page.$('.slot')); i++) {
    const d = new Date(Date.now() + 3 * 3600e3 + i * 86400e3).toISOString().slice(0, 10);
    await page.fill('#b-date', d);
    await page.waitForTimeout(400);
  }
  await page.click('.slot >> nth=1');
  await page.fill('#b-name', 'Mohammed Al Saud');
  await page.fill('#b-phone', '0551234567');
  await page.fill('#b-email', 'patient@demo.local');
  await page.fill('#b-nid', '1098765432');
  await page.check('input[name=consent]');
  await page.waitForFunction(() => /\d \+ \d/.test(document.querySelector('.field-captcha label').textContent));
  const q = await page.$eval('.field-captcha label span', (e) => e.textContent);
  await page.fill('#b-captcha', String(q.split('+').reduce((a, b) => a + Number(b), 0)));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/book-filled.png` });
  await page.click('.booking-form button[type=submit]');
  await page.waitForSelector('.success-card', { timeout: 8000 });
  const ref = await page.$eval('.success-card strong', (e) => e.textContent);
  if (!/^WMC-\d{6}$/.test(ref)) problems.push(`unexpected booking ref ${ref}`);
  ok(`booking confirmed (${ref})`);

  // Wrong CAPTCHA is rejected on the contact form.
  await page.goto(`${BASE}/contact`);
  await page.waitForFunction(() => /\d \+ \d/.test(document.querySelector('.field-captcha label').textContent));
  await page.fill('#c-name', 'Test Person');
  await page.fill('#c-email', 'test@example.com');
  await page.fill('#c-msg', 'Hello');
  await page.fill('#c-captcha', '99');
  await page.click('form.card button[type=submit]');
  await page.waitForSelector('.form-status.err');
  ok('contact form rejects a wrong CAPTCHA');

  // Chat assistant answers.
  await page.click('.fab-chat');
  await page.fill('#chat-input', 'Do you accept Bupa insurance?');
  await page.press('#chat-input', 'Enter');
  await page.waitForFunction(() => /Bupa Arabia/.test(document.querySelector('.chat-log').textContent));
  ok('chat assistant replies');
  await page.keyboard.press('Escape');

  // Emergency modal → ambulance request.
  await page.click('.header-cta .btn-emergency');
  await page.fill('#am-phone', '0559998888');
  await page.click('.ambulance-form button[type=submit]');
  await page.waitForSelector('.ambulance-form .form-status.ok');
  ok('ambulance request sent');
  await page.keyboard.press('Escape');

  // Newsletter.
  await page.fill('#nl-email', 'news@example.com');
  await page.click('.newsletter-form button[type=submit]');
  await page.waitForSelector('.newsletter-form .form-status.ok');
  ok('newsletter signup');

  // Patient portal shows the booking made above.
  await page.goto(`${BASE}/portal`);
  await page.waitForURL(/portal\/login/);
  await page.fill('#p-email', 'patient@demo.local');
  await page.fill('#p-pass', 'Patient#Demo2026');
  await page.click('.auth-card button[type=submit]');
  await page.waitForURL(`${BASE}/portal`);
  if (!(await page.textContent('.appt-list')).includes('Ahmed Siddiqui')) problems.push('portal does not list the new appointment');
  ok('patient portal lists the appointment');
  const adminAsPatient = await page.goto(`${BASE}/admin`);
  if (!(await page.textContent('main')).includes('Staff only')) problems.push(`patient reached the staff console (${adminAsPatient.status()})`);
  ok('patient is kept out of the staff console');
  await page.click('text=Sign out');
  await page.waitForURL(`${BASE}/`);

  // Staff console: admin sees the booking, changes status, reads the audit log.
  await page.goto(`${BASE}/portal/login`);
  await page.fill('#p-email', 'admin@demo.local');
  await page.fill('#p-pass', 'Admin#Demo2026!');
  await page.click('.auth-card button[type=submit]');
  await page.waitForURL(`${BASE}/admin`);
  if (!(await page.textContent('table')).includes(ref)) problems.push('admin table missing the booking');
  await page.selectOption('.inline-select', 'checked-in');
  await page.waitForTimeout(800);
  await page.reload();
  if ((await page.$eval('.inline-select', (e) => e.value)) !== 'checked-in') problems.push('status change did not persist');
  ok('admin updates appointment status');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/admin.png` });
  await page.goto(`${BASE}/admin/audit`);
  const integrity = await page.textContent('.integrity');
  if (!integrity.includes('intact')) problems.push(`audit log: ${integrity}`);
  ok(`audit log ${integrity.trim()}`);
  await page.goto(`${BASE}/admin/photos`);
  await page.waitForTimeout(1500);
  ok(`photo check page: ${(await page.textContent('.integrity')).trim()}`);

  await browser.close();
  if (problems.length) {
    console.error('\nProblems:\n- ' + problems.join('\n- '));
    process.exit(1);
  }
  console.log('\nAll smoke checks passed.');
})().catch((e) => { console.error(e); process.exit(1); });
