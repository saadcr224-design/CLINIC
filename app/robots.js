import content from '@/lib/content';

export default function robots() {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/portal', '/api/', '/cms'] },
    sitemap: `${content.site().url}/sitemap.xml`,
  };
}
