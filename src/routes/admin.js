'use strict';
const express = require('express');
const auth = require('../auth');
const store = require('../store');
const content = require('../content');
const audit = require('../audit');

const router = express.Router();
router.use(auth.requireAuth(['reception', 'doctor', 'admin'], '/portal/login'));
router.use((req, res, next) => {
  res.locals.can = (perm) => auth.can(req.session.user, perm);
  res.locals.noindex = true;
  next();
});

function permit(...perms) {
  return (req, res, next) => {
    if (perms.some((p) => auth.can(req.session.user, p))) return next();
    audit.log(req, 'auth.denied', req.originalUrl);
    res.status(403).render('pages/error', { title: 'Forbidden', status: 403, message: 'You do not have permission for this action.' });
  };
}

router.get('/', permit('appointments:read', 'appointments:read:own'), (req, res) => {
  const user = req.session.user;
  const own = !auth.can(user, 'appointments:read');
  const status = String(req.query.status || '');
  const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : '';
  const rows = store
    .find('appointments', (a) => (!own || a.doctor === user.doctorSlug) && (!status || a.status === status) && (!date || a.date === date))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  audit.log(req, 'admin.appointments.list', null, { count: rows.length, scope: own ? 'own' : 'all' });
  res.render('admin/appointments', { title: 'Appointments', rows, doctors: content.doctors(), status, date, own });
});

router.post('/appointments/:id/status', permit('appointments:update'), express.urlencoded({ extended: false }), (req, res) => {
  const status = String(req.body.status);
  if (!['confirmed', 'checked-in', 'completed', 'cancelled', 'no-show'].includes(status)) return res.status(400).send('Bad status');
  const row = store.update('appointments', req.params.id, { status });
  if (!row) return res.status(404).send('Not found');
  audit.log(req, 'admin.appointments.status', row.ref, { status });
  res.redirect('/admin');
});

router.get('/messages', permit('messages:read'), (req, res) => {
  const sets = {
    messages: store.all('messages'),
    ambulance: store.all('ambulance'),
    reviews: store.all('reviews'),
    applications: store.all('applications'),
    subscribers: store.all('subscribers'),
  };
  audit.log(req, 'admin.messages.list');
  res.render('admin/messages', { title: 'Inbox', ...sets });
});

// Every photo the site uses, so staff can check each one loads and shows the right subject.
router.get('/photos', permit('messages:read', 'audit:read'), (req, res) => {
  const site = content.site();
  const photos = [
    ...Object.entries(site.images).map(([k, src]) => ({ src, where: `Site · ${k}` })),
    ...content.departments().map((d) => ({ src: d.image, where: `Department · ${d.name}` })),
    ...content.doctors().map((d) => ({ src: d.photo, where: `Doctor · ${d.name}` })),
    ...content.posts().map((p) => ({ src: p.image, where: `Article · ${p.title}` })),
    ...site.fallbackImages.map((src, i) => ({ src, where: `Backup photo ${i + 1}` })),
    ...site.fallbackPortraits.map((src, i) => ({ src, where: `Backup portrait ${i + 1}` })),
  ];
  res.render('admin/photos', { title: 'Photo check', photos });
});

router.get('/audit', permit('audit:read'), (req, res) => {
  const integrity = audit.verify();
  const entries = audit.readEntries().slice(-300).reverse();
  audit.log(req, 'admin.audit.view');
  res.render('admin/audit', { title: 'Audit log', entries, integrity });
});

module.exports = router;
