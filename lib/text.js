'use strict';
// UI wording lives in locales/en.json so it can be changed without touching components.
const en = require('../locales/en.json');

const t = (key) => en[key] ?? key;

const fmtDate = (iso) =>
  new Date(iso + (iso.length === 10 ? 'T12:00:00+03:00' : '')).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Riyadh',
  });

// Responsive srcset for CDN images that accept a w= parameter (Unsplash/imgix).
const srcset = (src, widths = [400, 800, 1200]) =>
  /[?&]w=\d+/.test(src || '')
    ? widths.map((w) => `${src.replace(/([?&])w=\d+/, `$1w=${w}`).replace(/&h=\d+/, '')} ${w}w`).join(', ')
    : undefined;

module.exports = { t, fmtDate, srcset };
