'use strict';
const en = require('../locales/en.json');
const ar = require('../locales/ar.json');

const dict = { en, ar };
const LANGS = ['en', 'ar'];

// Arabic pages live under /ar, English at the root. Sets helpers used by every view.
function middleware(req, res, next) {
  const lang = req.baseUrl === '/ar' ? 'ar' : 'en';
  const strings = dict[lang];
  const prefix = lang === 'ar' ? '/ar' : '';
  const pathOnly = req.path === '/' ? '' : req.path;

  res.locals.lang = lang;
  res.locals.dir = lang === 'ar' ? 'rtl' : 'ltr';
  res.locals.t = (key) => strings[key] ?? en[key] ?? key;
  // Pick the right language from a bilingual content field: { en, ar }.
  res.locals.L = (field) => (field && typeof field === 'object' ? field[lang] ?? field.en : field);
  res.locals.url = (p = '/') => (prefix + p).replace(/\/$/, '') || '/';
  res.locals.altLangUrl = (lang === 'ar' ? pathOnly : '/ar' + pathOnly) || '/';
  res.locals.canonicalPath = prefix + pathOnly || '/';
  res.locals.enPath = pathOnly || '/';
  res.locals.arPath = '/ar' + pathOnly;
  res.locals.currentPath = pathOnly || '/';
  res.locals.fmtDate = (iso) =>
    new Date(iso + (iso.length === 10 ? 'T12:00:00+03:00' : '')).toLocaleDateString(lang === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-GB', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Riyadh',
    });
  next();
}

function t(lang, key) {
  return dict[lang][key] ?? en[key] ?? key;
}

module.exports = { middleware, t, LANGS };
