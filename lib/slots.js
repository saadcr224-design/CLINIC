'use strict';
// Appointment slot generation. Clinic times are Asia/Riyadh (UTC+3, no DST).
const store = require('./store');

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const SESSIONS = [
  ['09:00', '13:00'],
  ['16:00', '20:00'],
];
const STEP = 20; // minutes
const MAX_DAYS_AHEAD = 60;

const toMin = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
const toHHMM = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

function riyadhNow() {
  const now = new Date(Date.now() + 3 * 3600 * 1000);
  return { date: now.toISOString().slice(0, 10), minutes: now.getUTCHours() * 60 + now.getUTCMinutes() };
}

function dayKey(date) {
  return DAY_KEYS[new Date(date + 'T12:00:00Z').getUTCDay()];
}

function availableSlots(doctor, date) {
  if (!doctor || !doctor.days.includes(dayKey(date))) return [];
  const now = riyadhNow();
  const daysAhead = (Date.parse(date) - Date.parse(now.date)) / 86400000;
  if (daysAhead < 0 || daysAhead > MAX_DAYS_AHEAD) return [];

  const taken = new Set(
    store
      .find('appointments', (a) => a.doctor === doctor.slug && a.date === date && a.status !== 'cancelled')
      .map((a) => a.time)
  );
  const out = [];
  for (const [start, end] of SESSIONS) {
    for (let m = toMin(start); m + STEP <= toMin(end); m += STEP) {
      if (daysAhead === 0 && m <= now.minutes + 30) continue; // 30-min booking buffer today
      const hhmm = toHHMM(m);
      if (!taken.has(hhmm)) out.push(hhmm);
    }
  }
  return out;
}

module.exports = { availableSlots, dayKey, riyadhNow };
