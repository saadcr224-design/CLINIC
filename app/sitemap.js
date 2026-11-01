import content from '@/lib/content';

export default function sitemap() {
  const base = content.site().url;
  const today = new Date().toISOString().slice(0, 10);
  const pages = ['', '/about', '/doctors', '/departments', '/book', '/contact', '/blog', '/testimonials', '/faq', '/careers', '/insurance', '/privacy', '/terms', '/data-protection'];
  return [
    ...pages.map((p) => ({ url: base + p, lastModified: today })),
    ...content.departments().map((d) => ({ url: `${base}/departments/${d.slug}`, lastModified: today })),
    ...content.doctors().map((d) => ({ url: `${base}/doctors/${d.slug}`, lastModified: today })),
    ...content.posts().map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: p.date })),
  ];
}
