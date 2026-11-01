'use strict';
const express = require('express');
const content = require('./content');

const router = express.Router();

router.get('/robots.txt', (req, res) => {
  const site = content.site();
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /portal\nDisallow: /api/\nDisallow: /cms/\n\nSitemap: ${site.url}/sitemap.xml\n`);
});

router.get('/sitemap.xml', (req, res) => {
  const site = content.site();
  const paths = [
    '/', '/about', '/doctors', '/departments', '/book', '/contact', '/blog', '/testimonials', '/faq', '/careers', '/insurance',
    '/privacy', '/terms', '/data-protection',
    ...content.departments().map((d) => `/departments/${d.slug}`),
    ...content.doctors().map((d) => `/doctors/${d.slug}`),
    ...content.posts().map((p) => `/blog/${p.slug}`),
  ];
  const lastmod = (p) => {
    const post = content.posts().find((x) => p === `/blog/${x.slug}`);
    return post ? post.date : new Date().toISOString().slice(0, 10);
  };
  const body = paths.map((p) => `  <url><loc>${site.url}${p}</loc><lastmod>${lastmod(p)}</lastmod></url>`).join('\n');
  res
    .type('application/xml')
    .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
});

module.exports = router;
