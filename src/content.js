'use strict';
// Loads CMS-managed content from /content. Files are re-read when they change on disk,
// so edits made through the CMS (or by hand) appear without a restart.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'content');
const cache = new Map();

function load(name) {
  const file = path.join(dir, `${name}.json`);
  const mtime = fs.statSync(file).mtimeMs;
  const hit = cache.get(name);
  if (hit && hit.mtime === mtime) return hit.data;
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const data = Array.isArray(raw.items) ? raw.items : raw;
  cache.set(name, { mtime, data });
  return data;
}

module.exports = {
  // Site settings plus the photo set (kept in its own file so the CMS can edit photos alone).
  site: () => ({ ...load('site'), ...load('photos') }),
  departments: () => load('departments'),
  doctors: () => load('doctors'),
  posts: () => load('posts').slice().sort((a, b) => b.date.localeCompare(a.date)),
  testimonials: () => load('testimonials'),
  faqs: () => load('faqs'),
  jobs: () => load('jobs'),
  insurance: () => load('insurance'),
  department: (slug) => load('departments').find((d) => d.slug === slug),
  doctor: (slug) => load('doctors').find((d) => d.slug === slug),
  post: (slug) => load('posts').find((p) => p.slug === slug),
};
