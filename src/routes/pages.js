'use strict';
const express = require('express');
const content = require('../content');
const { newCaptcha } = require('../security');

const router = express.Router();

const notFound = (req, res) => res.status(404).render('pages/error', { title: res.locals.t('404.title'), status: 404, message: res.locals.t('404.text') });

router.get('/', (req, res) => {
  res.render('pages/home', {
    title: null,
    doctors: content.doctors().slice(0, 4),
    posts: content.posts().slice(0, 3),
    testimonials: content.testimonials().slice(0, 3),
  });
});

router.get('/about', (req, res) => res.render('pages/about', { title: res.locals.t('about.title') }));

router.get('/doctors', (req, res) => {
  const { L } = res.locals;
  const q = String(req.query.q || '').trim().toLowerCase().slice(0, 60);
  const filters = {
    q,
    dept: String(req.query.dept || ''),
    day: String(req.query.day || ''),
    gender: String(req.query.gender || ''),
  };
  const depts = Object.fromEntries(content.departments().map((d) => [d.slug, d]));
  const doctors = content.doctors().filter((d) => {
    if (filters.dept && d.department !== filters.dept) return false;
    if (filters.day && !d.days.includes(filters.day)) return false;
    if (filters.gender && d.gender !== filters.gender) return false;
    if (q) {
      const dept = depts[d.department];
      const hay = [d.name.en, d.name.ar, d.title.en, d.title.ar, dept && dept.name.en, dept && dept.name.ar, ...d.languages, L(d.bio)]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  res.render('pages/doctors', { title: res.locals.t('doctors.title'), doctors, filters });
});

router.get('/doctors/:slug', (req, res) => {
  const doctor = content.doctor(req.params.slug);
  if (!doctor) return notFound(req, res);
  res.render('pages/doctor', {
    title: res.locals.L(doctor.name),
    description: res.locals.L(doctor.bio),
    ogImage: doctor.photo,
    doctor,
    department: content.department(doctor.department),
    reviews: content.testimonials().filter((r) => r.department === doctor.department),
  });
});

router.get('/departments', (req, res) => res.render('pages/departments', { title: res.locals.t('departments.title') }));

router.get('/departments/:slug', (req, res) => {
  const department = content.department(req.params.slug);
  if (!department) return notFound(req, res);
  res.render('pages/department', {
    title: res.locals.L(department.name),
    description: res.locals.L(department.summary),
    ogImage: department.image,
    department,
    doctors: content.doctors().filter((d) => d.department === department.slug),
  });
});

router.get('/book', (req, res) => {
  res.render('pages/book', {
    title: res.locals.t('book.title'),
    captcha: newCaptcha(req),
    preDoctor: String(req.query.doctor || ''),
    preDept: String(req.query.dept || ''),
    providers: content.insurance().providers,
  });
});

router.get('/contact', (req, res) => res.render('pages/contact', { title: res.locals.t('contact.title'), captcha: newCaptcha(req) }));

router.get('/blog', (req, res) => {
  const cat = String(req.query.topic || '');
  const posts = content.posts().filter((p) => !cat || p.category === cat);
  res.render('pages/blog', { title: res.locals.t('blog.title'), posts, cat });
});

router.get('/blog/:slug', (req, res) => {
  const post = content.post(req.params.slug);
  if (!post) return notFound(req, res);
  res.render('pages/post', {
    title: res.locals.L(post.title),
    description: res.locals.L(post.excerpt),
    ogImage: post.image,
    ogType: 'article',
    post,
    author: content.doctor(post.author),
    related: content.posts().filter((p) => p.slug !== post.slug).slice(0, 3),
  });
});

router.get('/testimonials', (req, res) => {
  const reviews = content.testimonials();
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / (reviews.length || 1);
  res.render('pages/testimonials', { title: res.locals.t('testimonials.title'), reviews, avg, captcha: newCaptcha(req) });
});

router.get('/faq', (req, res) => res.render('pages/faq', { title: res.locals.t('faq.title'), faqs: content.faqs() }));

router.get('/careers', (req, res) => res.render('pages/careers', { title: res.locals.t('careers.title'), jobs: content.jobs(), captcha: newCaptcha(req) }));

router.get('/insurance', (req, res) => res.render('pages/insurance', { title: res.locals.t('insurance.title'), insurance: content.insurance() }));

for (const page of ['privacy', 'terms', 'data-protection']) {
  router.get(`/${page}`, (req, res) => {
    const titles = { privacy: 'footer.privacy', terms: 'footer.terms', 'data-protection': 'footer.dataProtection' };
    res.render(`legal/${page}-${res.locals.lang}`, { title: res.locals.t(titles[page]) });
  });
}

module.exports = { router, notFound };
