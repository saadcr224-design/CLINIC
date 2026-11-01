const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=(self)' },
];

// Decap CMS loads from a CDN and talks to the GitHub API, so /cms gets its own, wider policy.
const cmsCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://unpkg.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://api.github.com https://unpkg.com",
  "frame-ancestors 'self'",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // CMS-managed JSON is read at request time, so ship it with every server function.
  outputFileTracingIncludes: { '/**': ['./content/**', './locales/**'] },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/cms/:path*', headers: [{ key: 'Content-Security-Policy', value: cmsCsp }, { key: 'X-Frame-Options', value: 'SAMEORIGIN' }] },
      { source: '/(fonts|img)/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000, immutable' }] },
    ];
  },
  async rewrites() {
    return [{ source: '/cms', destination: '/cms/index.html' }];
  },
  async redirects() {
    // The site used to have an Arabic version under /ar; keep old links working.
    return [
      { source: '/ar', destination: '/', permanent: true },
      { source: '/ar/:path*', destination: '/:path*', permanent: true },
    ];
  },
};

export default nextConfig;
