'use strict';
// Background jobs: 24-hour appointment reminders and post-visit review requests.
// Runs inside the web process every 10 minutes. Each message is sent once, because the
// appointment is stamped (reminderSentAt / reviewRequestedAt) after sending.
const store = require('./store');
const content = require('./content');
const notify = require('./notify');
const audit = require('./audit');

const HOUR = 3600 * 1000;
// Clinic times are Asia/Riyadh (UTC+3, no daylight saving).
const apptTime = (a) => Date.parse(`${a.date}T${a.time}:00+03:00`);

function run(now = Date.now()) {
  const sent = { reminders: 0, reviews: 0 };
  for (const a of store.all('appointments')) {
    const doctor = content.doctor(a.doctor);
    if (!doctor) continue;
    const until = apptTime(a) - now;

    if (a.status === 'confirmed' && !a.reminderSentAt && until > 0 && until <= 24 * HOUR) {
      notify.appointmentReminder(a, doctor);
      store.update('appointments', a.id, { reminderSentAt: new Date(now).toISOString() });
      sent.reminders++;
    }
    if (a.status === 'completed' && !a.reviewRequestedAt && -until >= 2 * HOUR && -until <= 72 * HOUR) {
      notify.reviewRequest(a, doctor);
      store.update('appointments', a.id, { reviewRequestedAt: new Date(now).toISOString() });
      sent.reviews++;
    }
  }
  if (sent.reminders || sent.reviews) audit.log(null, 'automation.run', null, sent);
  return sent;
}

function start(intervalMs = 10 * 60 * 1000) {
  const tick = () => { try { run(); } catch (err) { console.error('[automation]', err); } };
  tick();
  return setInterval(tick, intervalMs).unref();
}

module.exports = { run, start };
