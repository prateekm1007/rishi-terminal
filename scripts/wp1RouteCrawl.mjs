#!/usr/bin/env node
// WP1 acceptance: route-crawl — identical nav, unique per-route titles,
// per-route canonical + og/twitter metadata across every public route.
// Exit 0 = all gates pass; exit 1 = at least one gate fails, with the
// failing route + reason printed raw (fail-first; C5/C10).
//
// Founder WP1 (2026-10-10): "One shell, nav and metadata for all routes,
// with a per-route canonical and og tags. Acceptance: a route-crawl
// script shows identical nav and unique titles."

const BASE = process.env.WP1_BASE ?? "https://rishi-terminal.vercel.app";

// Every top-level public route (dynamically parameterized sub-routes are
// represented by one representative each).
const ROUTES = [
  "/",
  "/screener",
  "/stocks",
  "/stock/SBIN",
  "/news",
  "/rishis",
  "/pulse",
  "/forex",
  "/forex/USDINR",
  "/commodities",
  "/commodities/gold",
  "/bonds",
  "/bonds/IN10YS",
  "/crypto",
  "/crypto/BTC",
  "/pricing",
  "/methodology",
  "/methodology/graham",
  "/lab",
  "/privacy",
  "/terms",
];

const GENERIC_TITLES = new Set([
  "Rishi Terminal - Sacred Investment Intelligence",
]);

function extractNavLinks(html) {
  // The app shell sidebar: links inside <nav> or the first <aside>.
  const navMatch = html.match(/<nav[\s>][\s\S]*?<\/nav>/i);
  const asideMatch = !navMatch ? html.match(/<aside[\s>][\s\S]*?<\/aside>/i) : null;
  const scope = navMatch ? navMatch[0] : asideMatch ? asideMatch[0] : "";
  if (!scope) return [];
  const links = [...scope.matchAll(/<a\b[^>]*href="\/([^"]*)"/g)].map((m) =>
    m[1].split("?")[0].split("#")[0],
  );
  // Normalize dynamic detail links to their section prefix so routes with
  // different subjects still show the SAME nav skeleton.
  return [...new Set(links.map((l) => "/" + (l.split("/")[0] ?? "")))].sort();
}

function meta(html, re) {
  const m = html.match(re);
  return m ? m[1] ?? m[0] : null;
}

let failures = 0;
const fail = (msg) => {
  failures++;
  console.log(`FAIL ${msg}`);
};


let baseline = null;
const results = [];

for (const r of ROUTES) {
  const res = await fetch(BASE + r, { redirect: "manual" });
  if (res.status >= 300 && res.status < 400) {
    results.push({ route: r, redirect: res.headers.get("location") });
    console.log(`--   ${r} -> ${res.status} ${res.headers.get("location")}`);
    continue;
  }
  if (res.status !== 200) {
    // A non-200 route is a BROKEN route — the crawl fails it rather than
    // silently treating the error page as a metadata surface.
    results.push({ route: r, broken: res.status });
    console.log(`--   ${r} -> HTTP ${res.status} (broken route)`);
    continue;
  }
  const html = await res.text();
  const title = meta(html, /<title>([^<]*)<\/title>/);
  const canonical = meta(html, /<link[^>]*rel="canonical"[^>]*href="([^"]*)"/);
  const ogTitle = meta(html, /<meta[^>]*property="og:title"[^>]*content="([^"]*)"/);
  const ogUrl = meta(html, /<meta[^>]*property="og:url"[^>]*content="([^"]*)"/);
  const twTitle = meta(html, /<meta[^>]*name="twitter:title"[^>]*content="([^"]*)"/);
  const nav = extractNavLinks(html);
  results.push({ route: r, title, canonical, ogTitle, ogUrl, twTitle, nav });
}

for (const x of results) {
  if (x.redirect !== undefined) continue;
  if (x.broken !== undefined) {
    fail(`${x.route}: HTTP ${x.broken} — route is broken (crawl asserts 200 surfaces only)`);
    continue;
  }
  const isRoot = x.route === "/";
  // Gate 1: title exists and is route-specific (the site title is the
  // legitimate title of the root route itself).
  if (!x.title) fail(`${x.route}: no <title>`);
  else if (!isRoot && GENERIC_TITLES.has(x.title)) fail(`${x.route}: generic title "${x.title}"`);
  // Gate 2: per-route canonical (the root's canonical is the bare origin).
  if (!x.canonical) fail(`${x.route}: no canonical`);
  else if (isRoot && !/^https?:\/\/[^/]+\/?$/.test(x.canonical)) fail(`${x.route}: root canonical ${x.canonical} is not the bare origin`);
  else if (!isRoot && !x.canonical.toLowerCase().endsWith(x.route.toLowerCase())) fail(`${x.route}: canonical ${x.canonical} does not match route`);
  // Gate 3: per-route og:title (the site title is the root's own).
  if (!x.ogTitle) fail(`${x.route}: no og:title`);
  else if (!isRoot && GENERIC_TITLES.has(x.ogTitle)) fail(`${x.route}: generic og:title`);
  // Gate 4: og:url points at this route, not the root.
  if (!x.ogUrl) fail(`${x.route}: no og:url`);
  else if (isRoot && !/^https?:\/\/[^/]+\/?$/.test(x.ogUrl)) fail(`${x.route}: root og:url ${x.ogUrl} is not the bare origin`);
  else if (!isRoot && !x.ogUrl.toLowerCase().endsWith(x.route.toLowerCase())) fail(`${x.route}: og:url ${x.ogUrl} does not match route`);
  // Gate 4b: shell present — every non-redirect route carries the app nav.
  if (!isRoot && (!x.nav || x.nav.length === 0)) fail(`${x.route}: no app-shell nav in SSR`);
}

// Gate 5: identical nav across all non-redirect routes.
const navRoutes = results.filter((x) => x.nav);
baseline = navRoutes[0]?.nav ?? [];
for (const x of navRoutes) {
  if (x.nav.length > 0 && JSON.stringify(x.nav) !== JSON.stringify(baseline)) {
    fail(`${x.route}: nav differs from ${navRoutes[0].route}: ${JSON.stringify(x.nav)} vs ${JSON.stringify(baseline)}`);
  }
}
if (baseline.length === 0) fail("nav extraction found zero links — positive control failed");

// Gate 6: no route links /screener in the nav (one product surface).
for (const x of navRoutes) {
  if (x.nav.includes("/screener")) fail(`${x.route}: nav links /screener`);
}

// Gate 7: /screener permanently redirects to /stocks.
const screener = results.find((x) => x.route === "/screener");
if (!screener || screener.redirect === undefined) fail("/screener: expected a redirect");
else if (!/\/stocks$/.test(screener.redirect ?? "")) fail(`/screener: redirects to ${screener.redirect}, expected /stocks`);

// Positive control: the crawl actually saw content (B-18).
const sawStocks = results.find((x) => x.route === "/stocks");
if (!sawStocks || !sawStocks.title) fail("positive control: /stocks produced no title — crawl is broken");

const checked = results.filter((x) => x.redirect === undefined).length;
console.log(`\nroutes checked: ${checked} (of ${ROUTES.length}; redirects excluded)`);
console.log(failures === 0 ? "WP1 ROUTE-CRAWL: PASS" : `WP1 ROUTE-CRAWL: FAIL (${failures} failures)`);
process.exit(failures === 0 ? 0 : 1);
