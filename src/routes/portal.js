'use strict';
const express = require('express');
const auth = require('../auth');
const store = require('../store');
const content = require('../content');
const audit = require('../audit');
const { limiter, clean } = require('../security');
const { isProd } = require('../config');
const { riyadhNow } = require('../slots');

const router = express.Router();
const loginLimiter = limiter(15, 8);

// Only allow redirecting to local paths after login (prevents open redirects).
const safeNext = (n, fallback) => (typeof n === 'string' && /^\/(?!\/)[\w\-/?=&.%]*$/.test(n) ? n : fallback);

router.get('/portal/login', (req, res) => {
  res.render('portal/login', {
    title: res.locals.t('portal.title'),
    noindex: true,
    error: null,
    next: safeNext(req.query.next, res.locals.url('/portal')),
    demo: isProd ? null : auth.DEMO_USERS,
  });
});

router.post('/portal/login', loginLimiter, express.urlencoded({ extended: false }), async (req, res, next) => {
  try {
    const email = clean(req.body.email, 254);
    const user = await auth.verify(email, String(req.body.password || '').slice(0, 200));
    if (!user) {
      audit.log(req, 'auth.failed', email);
      return res.status(401).render('portal/login', {
        title: res.locals.t('portal.title'), noindex: true, error: res.locals.t('portal.invalid'),
        next: safeNext(req.body.next, res.locals.url('/portal')), demo: isProd ? null : auth.DEMO_USERS,
      });
    }
    await auth.login(req, user);
    const home = user.role === 'patient' ? res.locals.url('/portal') : '/admin';
    res.redirect(user.role === 'patient' ? safeNext(req.body.next, home) : home);
  } catch (err) {
    next(err);
  }
});

router.post('/portal/logout', (req, res) => {
  audit.log(req, 'auth.logout');
  req.session = null;
  res.redirect('/');
});

router.get('/portal', (req, res, next) => auth.requireAuth(['patient'], res.locals.url('/portal/login'))(req, res, next), (req, res) => {
  const user = auth.findByEmail(req.session.user.email);
  const today = riyadhNow().date;
  const appointments = store
    .find('appointments', (a) => a.patient.email === user.email && a.date >= today && a.status !== 'cancelled')
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .map((a) => ({ ...a, doctorInfo: content.doctor(a.doctor) }));
  audit.log(req, 'portal.view', user.patient && user.patient.mrn);
  res.render('portal/dashboard', { title: res.locals.t('portal.title'), noindex: true, profile: user, appointments });
});

module.exports = router;
