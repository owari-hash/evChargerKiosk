import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

/**
 * Enforced: rules that cannot break a page — no framing (clickjacking), no
 * plugins, no <base> hijack, HTTPS only.
 */
const ENFORCED_CSP = [
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(isProd ? ['upgrade-insecure-requests'] : []),
].join('; ');

/**
 * Full policy in report-only mode: the browser logs what it would block in the
 * console without blocking it. Once the console is clean in production, move
 * these into ENFORCED_CSP. Map tiles and images can come from configured hosts,
 * so `img-src` stays broad on https.
 */
const REPORT_ONLY_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' wss: https://www.google-analytics.com https://*.google-analytics.com https://router.project-osrm.org",
  "frame-src 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: ENFORCED_CSP },
  { key: 'Content-Security-Policy-Report-Only', value: REPORT_ONLY_CSP },
  ...(isProd ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }] : []),
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Location is used by "near me"; the camera, mic and payment APIs are not.
  { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=(), payment=(), usb=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
  // "the QR page" is what people call it, so /qr answers too.
  async redirects() {
    return [
      { source: '/qr', destination: '/download', permanent: false },
      { source: '/download/app', destination: '/app', permanent: false },
      // The pricing page only repeated what each station card shows.
      { source: '/pricing', destination: '/stations', permanent: true },
    ];
  },
  // The default bottom-left spot sits under the map's own bottom-left
  // controls (results pill, locate button) during local dev — dev-only, but
  // out of the way is one less thing to mistake for a real UI bug.
  devIndicators: {
    position: 'top-right',
  },
};

export default nextConfig;
