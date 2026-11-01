'use strict';
// UI strings live in locales/en.json so wording can be changed without touching templates.
const en = require('../locales/en.json');

const t = (key) => en[key] ?? key;

function middleware(req, res, next) {
  const pathOnly = req.path === '/' ? '' : req.path;
  res.locals.lang = 'en';
  res.locals.dir = 'ltr';
  res.locals.t = t;
  // Content fields are plain strings; L() is kept so templates read the same everywhere.
  res.locals.L = (field) => (field && typeof field === 'object' && !Array.isArray(field) ? field.en : field);
  res.locals.url = (p = '/') => p;
  res.locals.canonicalPath = pathOnly || '/';
  res.locals.currentPath = pathOnly || '/';
  res.locals.fmtDate = (iso) =>
    new Date(iso + (iso.length === 10 ? 'T12:00:00+03:00' : '')).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Riyadh',
    });
  next();
}

module.exports = { middleware, t };
