#!/usr/bin/env node
// Defect reproduction probe — founder round 2026-10-10 (17 defects).
// Read-only GET probes against the deployed site. Prints raw extracts;
// every defect is confirmed or refuted from this output (rule 28).
const BASE = "https://rishi-terminal.vercel.app";

const routes = [
  "/",
  "/stocks",
  "/screener",
  "/stock/SBIN",
  "/news",
  "/rishis",
  "/pulse",
  "/forex",
  "/commodities",
  "/bonds",
  "/pricing",
  "/methodology",
  "/lab",
];

const pages = {};
for (const r of routes) {
  try {
    const res = await fetch(BASE + r, { headers: { "cache-control": "no-cache" } });
    const html = await res.text();
    pages[r] = { status: res.status, html };
    console.log(`\n##### ${r} -> HTTP ${res.status} (${html.length} bytes)`);
  } catch (e) {
    console.log(`\n##### ${r} -> FETCH ERROR ${e.message}`);
    pages[r] = { status: 0, html: "" };
  }
}

const count = (re, s) => (s.match(re) || []).length;
const first = (re, s, n = 1) => {
  const m = s.match(re);
  return m ? m[n] : "(absent)";
};

function section(title, fn) {
  console.log(`\n=== ${title} ===`);
  try { fn(); } catch (e) { console.log(`  section error: ${e.message}`); }
}

section("D1a: /stocks screener counts", () => {
  const h = pages["/stocks"].html;
  console.log("  STRONG BUY occurrences:", count(/STRONG BUY/g, h));
  console.log("  LARGE CAP occurrences:", count(/LARGE CAP/g, h));
  console.log("  title:", first(/<title>([^<]*)<\/title>/, h));
  console.log("  data rows (tr):", count(/<tr[\s>]/g, h));
  console.log("  SBIN row extract:", first(/SBIN[^<]{0,200}/, h));
});

section("D1b: /screener counts", () => {
  const h = pages["/screener"].html;
  console.log("  status:", pages["/screener"].status);
  console.log("  STRONG BUY occurrences:", count(/STRONG BUY/g, h));
  console.log("  LARGE CAP occurrences:", count(/LARGE CAP/g, h));
  console.log("  title:", first(/<title>([^<]*)<\/title>/, h));
  console.log("  SBIN row extract:", first(/SBIN[^<]{0,200}/, h));
});

section("D1c+D3+D4: /stock/SBIN verdict block", () => {
  const h = pages["/stock/SBIN"].html;
  console.log("  title:", first(/<title>([^<]*)<\/title>/, h));
  // scores: find any standalone 2-digit numbers near "score" words
  for (const m of h.matchAll(/(score|QVPS|consensus|Consensus)[^<]{0,120}/g)) {
    console.log("  ~", m[0].replace(/\s+/g, " ").slice(0, 130));
  }
  for (const key of ["D/E", "OPM", "NCAV", "ROE"]) {
    const m = h.match(new RegExp(key + "[^<]{0,80}"));
    if (m) console.log("  metric", key, ":", m[0].replace(/\s+/g, " ").slice(0, 100));
  }
  console.log("  'Resolving intelligence' present:", /Resolving intelligence/i.test(h));
  console.log("  intelligence section extract:", first(/Rishi Intelligence[\s\S]{0,300}/, h).replace(/\s+/g, " ").slice(0, 320));
  console.log("  Wisdom section extract:", first(/Wisdom[\s\S]{0,200}/, h).replace(/\s+/g, " ").slice(0, 220));
  console.log("  'no historical parallels':", first(/No historical parallels[^<]*/, h));
});

section("D2: shell/nav + metadata per route", () => {
  for (const r of ["/", "/stocks", "/news", "/rishis", "/pulse", "/forex", "/commodities", "/bonds", "/lab"]) {
    const h = pages[r].html;
    if (!h) continue;
    const navScreener = /href="\/screener"/.test(h);
    const navStocks = /href="\/stocks"/.test(h);
    const canonical = first(/<link[^>]*rel="canonical"[^>]*>/, h);
    const ogTitle = first(/<meta[^>]*property="og:title"[^>]*>/, h);
    const twTitle = first(/<meta[^>]*name="twitter:title"[^>]*>/, h);
    const ogUrl = first(/<meta[^>]*property="og:url"[^>]*>/, h);
    console.log(`  ${r}: nav->/screener=${navScreener} nav->/stocks=${navStocks}`);
    console.log(`    title: ${first(/<title>([^<]*)<\/title>/, h)}`);
    console.log(`    canonical: ${canonical === "(absent)" ? "ABSENT" : canonical}`);
    console.log(`    og:title: ${ogTitle === "(absent)" ? "ABSENT" : ogTitle.slice(0, 120)}`);
    console.log(`    twitter:title: ${twTitle === "(absent)" ? "ABSENT" : twTitle.slice(0, 120)}`);
    console.log(`    og:url: ${ogUrl === "(absent)" ? "ABSENT" : ogUrl.slice(0, 120)}`);
  }
});

section("D6: /screener invalid + duplicate tickers", () => {
  const h = pages["/screener"].html;
  const suspicious = ["FLIPKART", "BLINKIT", "DUNKINDONUTS", "DOMINOS", "TANISHQ", "SEALEDAIR", "PHARMAINDS", "AUTOSEGM", "GRAINS", "TIMINGMECH", "INDIGONAV", "SUNPHARMA2", "RAYMOND2", "NAUKRI", "HGELEC", "ANUPAM", "KALYANKJIL", "KALYANAJW", "CONCOR", "ANANDRATHI", "COLPAL", "TASTYBITE", "RVNL", "JISLJALEQS", "GPIL"];
  for (const t of suspicious) {
    const present = new RegExp(`\\b${t}\\b`).test(h);
    if (present) console.log("  PRESENT:", t);
  }
});

section("D7: Rishi counts + pricing copy", () => {
  const rh = pages["/rishis"].html;
  const ph = pages["/pricing"].html;
  console.log("  /rishis title:", first(/<title>([^<]*)<\/title>/, rh));
  console.log("  /rishis Soros present:", /Soros/i.test(rh));
  // persona-ish blocks
  console.log("  /rishis card-ish count (h3):", count(/<h3[\s>]/g, rh));
  console.log("  /pricing Soros present:", /Soros/i.test(ph));
  console.log("  /pricing 'free' occurrences:", count(/free/gi, ph));
  console.log("  /pricing 20/21 mentions:", first(/(20|21)[^<]{0,40}Rishi/i, ph));
  console.log("  /stocks 'top-5'|top 5:", /top.?5/i.test(pages["/stocks"].html));
});

section("D8: /pulse macro facts", () => {
  const h = pages["/pulse"].html;
  for (const m of h.matchAll(/(6\.9[0-9]|7\.0[0-9]|7\.1[0-9])%[^<]{0,80}/g)) console.log("  ~", m[0].replace(/\s+/g, " ").slice(0, 110));
  console.log("  spread claim:", first(/spread[^<]{0,100}/i, h));
  console.log("  softening:", first(/soften[^<]{0,80}/i, h));
  console.log("  bps mentions:", [...h.matchAll(/[+-]?\d+\s?bps/gi)].slice(0, 6).map((m) => m[0]).join(" | "));
  console.log("  gold on /:", first(/Gold[\s\S]{0,120}/, pages["/"].html).replace(/\s+/g, " ").slice(0, 140));
});

section("D8b: /bonds facts", () => {
  const h = pages["/bonds"].html;
  console.log("  10Y:", first(/10Y[^<]{0,60}/, h));
  console.log("  matured Aug 2026:", [...h.matchAll(/[^<>]{0,60}Aug[^<>]{0,12}2026[^<>]{0,60}/g)].slice(0, 5).map((m) => m[0].replace(/\s+/g, " ")).join(" || "));
  console.log("  2Y duration row:", first(/2Y[^<]{0,140}/, h));
  console.log("  header counts:", first(/(Maturity|Count|Total)[^<]{0,120}/, h));
  console.log("  AA ratings:", [...h.matchAll(/AA\+?/g)].length, "occurrences of AA/AA+");
});

section("D9+D17: /forex and /commodities", () => {
  const fh = pages["/forex"].html;
  console.log("  'Live currency markets':", first(/Live currency[^<]*/, fh));
  console.log("  REFERENCE count:", count(/REFERENCE/g, fh));
  console.log("  JPY/USD:", first(/JPY\/USD[^<]{0,40}/, fh));
  const ch = pages["/commodities"].html;
  console.log("  gold 52W:", first(/52W[^<]{0,60}/, ch));
  console.log("  '$' on commodities:", count(/\$/g, ch));
  console.log("  MCX extract:", first(/MCX[^<]{0,80}/, ch));
});

section("D11+D12+D16: dashboard / crypto / news", () => {
  const h = pages["/"].html;
  console.log("  links to /lab:", count(/href="\/lab"/g, h));
  console.log("  Portfolio/Watchlist/Compare:", [...h.matchAll(/(Portfolio|Watchlist|Compare)[^<]{0,40}/g)].slice(0, 5).map((m) => m[0].replace(/\s+/g, " ")).join(" | "));
  console.log("  'Observation time':", first(/Observation time[^<]*/, h));
  console.log("  gold price:", first(/\$?4,2[0-9][0-9][^<]{0,40}/, h));
  console.log("  BTC dominance:", first(/dominance[^<]{0,60}/i, h));
  const nh = pages["/news"].html;
  console.log("  /news '--' ticker:", (nh.match(/--/g) || []).length, "occurrences of --");
  console.log("  /news headline count (article):", count(/<article/g, nh));
});

section("D13+D14: taxonomy + methodology", () => {
  const h = pages["/stocks"].html + pages["/screener"].html;
  for (const pair of [["Agri", /AgriTech/], ["Defence", /Defense/], ["Jewellery", /Jewelry/], ["Realty", /RealEstate/]]) {
    console.log(`  taxonomy ${pair[0]}+variant present:`, new RegExp(pair[0]).test(h), new RegExp(pair[1].source).test(h));
  }
  console.log("  FinTech present:", /FinTech/.test(h), "| Fintech present:", /Fintech/.test(h));
  const mh = pages["/methodology"].html;
  console.log("  S2-01 leak:", first(/\(S2-\d+\)/, mh));
  console.log("  /basant slug leak:", first(/href="[^"]*basant[^"]*"/, mh));
});

section("D15: chat widget markers", () => {
  for (const r of ["/", "/pricing", "/stock/SBIN"]) {
    const h = pages[r].html;
    console.log(`  ${r}: 'Agnes' present:`, /Agnes/i.test(h), "| 'or life' present:", /or life/i.test(h), "| 'Powered by':", first(/Powered by[^<"]{0,40}/, h));
  }
});

console.log("\n##### probe complete");
