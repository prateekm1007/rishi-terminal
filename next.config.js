/** @type {import("next").NextConfig} */

// Remediation T9 — baseline security headers.
//
// CSP ships in Report-Only first so violations can be observed in devtools /
// reporting before enforcement. frame-ancestors is enforced immediately: it
// only restricts who may embed us in an iframe and cannot break the app itself.
// 'unsafe-inline' / 'unsafe-eval' are still required by Next.js (inline theme
// bootstrap script, dev-mode HMR); tighten together with enforcement later.
const cspReportOnly = [
  "default-src 'self'",
  // inline theme bootstrap in app/layout.tsx; Razorpay checkout.js;
  // 'unsafe-eval' needed by next dev / React refresh in development.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://checkout.razorpay.com https://api.razorpay.com https://generativelanguage.googleapis.com https://www.nseindia.com https://query1.finance.yahoo.com https://query2.finance.yahoo.com https://api.coingecko.com https://open.er-api.com",
  "frame-src https://api.razorpay.com https://checkout.razorpay.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
  // R8: violations land on /api/csp-report (logged server-side, rate-limited).
  // ENFORCEMENT TARGET: 2026-10-07 — after >= 1 week of clean reports, drop
  // the -Report-Only suffix (keep frame-ancestors enforced as it is today).
  "report-uri /api/csp-report",
  "report-to csp-endpoint",
].join('; ');

const securityHeaders = [
  // R8: named reporting endpoint group for report-to (modern browsers).
  { key: 'Reporting-Endpoints', value: 'csp-endpoint="/api/csp-report"' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Enforced immediately — see comment above.
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'Content-Security-Policy-Report-Only', value: cspReportOnly },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
];

const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    // T12: renamed/legacy NSE symbols 308-redirect to the canonical symbol.
    // Source of truth: lib/registry/tickerAliases.json (require works in
    // plain-JS next.config; TS modules import the same JSON).
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- next.config is CommonJS by design
    const aliasMap = require("./lib/registry/tickerAliases.json");
    const aliasRedirects = Object.entries(aliasMap)
      .filter(([oldSym]) => !oldSym.startsWith("$"))
      .map(([oldSym, canonical]) => ({
        source: `/stock/${oldSym}`,
        destination: `/stock/${encodeURIComponent(canonical)}`,
        permanent: true,
      }));
    return [
      ...aliasRedirects,
      {
        source: '/commodity/:symbol',
        destination: '/commodities/:symbol',
        permanent: true,
      },
      {
        source: '/portfolio',
        destination: '/lab?tab=holdings',
        permanent: true,
      },
      {
        source: '/watchlist',
        destination: '/lab?tab=watchlist',
        permanent: true,
      },
      {
        source: '/compare',
        destination: '/lab?tab=compare',
        permanent: true,
      },
      {
        source: '/backtest',
        destination: '/lab',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;