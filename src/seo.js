'use strict';
const express = require('express');
const content = require('./content');

const router = express.Router();

router.get('/robots.txt', (req, res) => {
  const site = content.site();
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /portal\nDisallow: /ar/portal\nDisallow: /api/\nDisallow: /cms/\n\nSitemap: ${site.url}/sitemap.xml\n`);
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
  const ar = (p) => (p === '/' ? '/ar' : '/ar' + p);
  const entry = (loc, p) =>
    `  <url><loc>${site.url}${loc}</loc><lastmod>${lastmod(p)}</lastmod>` +
    `<xhtml:link rel="alternate" hreflang="en" href="${site.url}${p}"/>` +
    `<xhtml:link rel="alternate" hreflang="ar" href="${site.url}${ar(p)}"/>` +
    `<xhtml:link rel="alternate" hreflang="x-default" href="${site.url}${p}"/></url>`;
  const body = paths.flatMap((p) => [entry(p, p), entry(ar(p), p)]).join('\n');
  res
    .type('application/xml')
    .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>\n`);
});

module.exports = router;
