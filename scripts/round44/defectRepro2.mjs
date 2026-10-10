#!/usr/bin/env node
// Deeper defect reproduction — round 2. Fixes: first() helper (capture-group bug),
// redirect detection, row-level ticker analysis, escaped-payload search.
const BASE = "https://rishi-terminal.vercel.app";

async function get(r, opts = {}) {
  const res = await fetch(BASE + r, { headers: { "cache-control": "no-cache" }, redirect: opts.noFollow ? "manual" : "follow" });
  const html = await res.text();
  return { status: res.status, html, loc: res.headers.get("location") };
}

const all = {};
for (const r of ["/", "/stocks", "/screener", "/stock/SBIN", "/news", "/pulse", "/forex", "/commodities", "/bonds", "/pricing", "/methodology", "/rishis"]) {
  all[r] = await get(r);
}

const m0 = (re, s) => { const m = s.match(re); return m ? m[0] : "(absent)"; };
const allMatches = (re, s, n = 0) => [...s.matchAll(re)].map((m) => m[n] ?? m[0]);

console.log("=== REDIRECT CHECK (no-follow) ===");
for (const r of ["/screener", "/stocks"]) {
  const x = await get(r, { noFollow: true });
  console.log(`  ${r}: HTTP ${x.status} location=${x.loc ?? "(none)"}`);
}

console.log("\n=== /stocks ROW ANALYSIS ===");
{
  const h = all["/stocks"].html;
  const rows = allMatches(/<tr[\s>][\s\S]*?<\/tr>/g, h);
  console.log("  total <tr>:", rows.length);
  const sbinRow = rows.find((r) => /SBIN/i.test(r));
  console.log("  SBIN row (raw, 700 chars):", sbinRow ? sbinRow.replace(/\s+/g, " ").slice(0, 700) : "(no SBIN row)");
  console.log("  STRONG BUY (case-insens) occurrences:", (h.match(/STRONG BUY/gi) || []).length);
  console.log("  Strong Buy (title case):", (h.match(/Strong Buy/g) || []).length);
  console.log("  LARGE CAP (case-insens):", (h.match(/LARGE CAP/gi) || []).length);
  console.log("  Large Cap (title case):", (h.match(/Large Cap/g) || []).length);
  // alias duplicates: count rows containing each symbol token
  const tokens = ["SUNPHARMA", "SUNPHARMA2", "RAYMOND", "RAYMOND2", "INFOEDGE", "NAUKRI", "HGINFRA", "HGELEC", "ANURAS", "ANUPAM", "KALYAN", "KALYANKJIL", "KALYANAJW", "CONTAINERCO", "CONCOR", "ANANDCURE", "ANANDRATHI", "COLGATE", "COLPAL", "TASYBITE", "TASTYBITE", "RAILVIKAS", "RVNL", "JAINIRRIG", "JISLJALEQS", "GODAWARI", "GPIL", "KAPIL", "BNRSEC", "KAMOPAINTS", "KNESL", "DFL", "RADICON", "WINDMACHIN"];
  for (const t of tokens) {
    const rowCount = rows.filter((r) => new RegExp(`\\b${t}\\b`).test(r)).length;
    if (rowCount > 0) console.log(`  rows containing ${t}: ${rowCount}`);
  }
}

console.log("\n=== /stock/SBIN intelligence + wisdom + missed targets ===");
{
  const h = all["/stock/SBIN"].html;
  const i = h.indexOf("Rishi Intelligence");
  console.log("  around 'Rishi Intelligence':", JSON.stringify(h.slice(Math.max(0, i - 100), i + 400)).replace(/\\u0026/g, "&").slice(0, 600));
  const w = h.search(/Wisdom/);
  console.log("  around 'Wisdom':", JSON.stringify(h.slice(Math.max(0, w - 50), w + 350)).slice(0, 450));
  console.log("  Kacholia comps:", m0(/Kacholia[\s\S]{0,600}?comps[\s\S]{0,400}?\]/, h).replace(/\s+/g, " ").slice(0, 500));
  console.log("  Greenblatt comps:", m0(/Greenblatt model signals[\s\S]{0,200}/, h).replace(/\s+/g, " ").slice(0, 240));
  const g = h.indexOf('"Joel Greenblatt"');
  const gRow = h.slice(g, g + 1200);
  const ey = gRow.match(/Earnings Yield[^}]{0,140}/);
  const roc = gRow.match(/ROC[^}]{0,140}/);
  console.log("  Greenblatt EY comp:", ey ? ey[0].replace(/\s+/g, " ") : "(not found)");
  console.log("  Greenblatt ROC comp:", roc ? roc[0].replace(/\s+/g, " ") : "(not found)");
}

console.log("\n=== /pulse literals ===");
{
  const h = all["/pulse"].html;
  for (const lit of ["6.92", "7.08", "6.25", "repo", "Repo", "spread", "Gold", "gold", "4,209", "yield", "soften", "G-Sec"]) {
    const idxs = allMatches(new RegExp(lit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), h).length;
    console.log(`  '${lit}': ${idxs} occurrences`);
  }
  const i = h.indexOf("6.92");
  if (i >= 0) console.log("  around 6.92:", JSON.stringify(h.slice(i - 150, i + 150)));
  const j = h.indexOf("+8bps");
  if (j >= 0) console.log("  around +8bps:", JSON.stringify(h.slice(j - 200, j + 100)));
  const sp = h.indexOf("repo");
  if (sp >= 0) console.log("  around repo:", JSON.stringify(h.slice(sp - 100, sp + 200)));
}

console.log("\n=== /bonds literals ===");
{
  const h = all["/bonds"].html;
  for (const lit of ["7.08", "6.92", "10Y", "10Y G-Sec", "T-bill", "duration", "Matured", "matured", "AA+", "SDL", "Reliance", "HDFC"]) {
    console.log(`  '${lit}': ${(h.match(new RegExp(lit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length} occurrences`);
  }
  const i = h.indexOf("7.08");
  if (i >= 0) console.log("  around 7.08:", JSON.stringify(h.slice(i - 150, i + 100)));
  const t = h.indexOf("T-bill");
  if (t >= 0) console.log("  around T-bill:", JSON.stringify(h.slice(t - 100, t + 250)));
  const d = h.indexOf("duration");
  if (d >= 0) console.log("  around duration:", JSON.stringify(h.slice(d - 120, d + 160)));
}

console.log("\n=== /forex literals ===");
{
  const h = all["/forex"].html;
  for (const lit of ["Live currency", "JPY", "USD/JPY", "JPY/USD", "REFERENCE", "24H", "0.0000"]) {
    console.log(`  '${lit}': ${(h.match(new RegExp(lit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length} occurrences`);
  }
  const j = h.indexOf("JPY");
  if (j >= 0) console.log("  around JPY:", JSON.stringify(h.slice(j - 120, j + 200)));
  const l = h.indexOf("Live");
  if (l >= 0) console.log("  around Live:", JSON.stringify(h.slice(l - 80, l + 160)));
}

console.log("\n=== /commodities literals ===");
{
  const h = all["/commodities"].html;
  for (const lit of ["52W", "2,200", "2,750", "4,209", "MCX", "Fear", "Greed", "\\$", "Gold"]) {
    console.log(`  '${lit}': ${(h.match(new RegExp(lit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length} occurrences`);
  }
  const g = h.indexOf("52W");
  if (g >= 0) console.log("  around 52W:", JSON.stringify(h.slice(g - 100, g + 200)));
  const mcx = h.indexOf("MCX");
  if (mcx >= 0) console.log("  around MCX:", JSON.stringify(h.slice(mcx - 60, mcx + 200)));
}

console.log("\n=== / dashboard ===");
{
  const h = all["/"].html;
  for (const label of ["Portfolio", "Watchlist", "Compare", "dominance", "4,209", "Observation time", "Fear", "Greed"]) {
    const i = h.indexOf(label);
    if (i < 0) { console.log(`  '${label}': absent`); continue; }
    const seg = h.slice(Math.max(0, i - 250), i + 150);
    const href = seg.match(/href="([^"]*)"[^>]*>[^<]*$/);
    console.log(`  '${label}' nearby href:`, href ? href[1] : "(no href in preceding 250 chars)");
  }
  console.log("  gold context:", m0(/Gold[^<]{0,80}/, h));
}

console.log("\n=== /news ===");
{
  const h = all["/news"].html;
  const i = h.indexOf("--");
  console.log("  first '--' context:", JSON.stringify(h.slice(Math.max(0, i - 100), i + 100)));
  console.log("  nav marker old-shell (Screener link):", /href="\/screener"/.test(h));
  console.log("  canonical:", m0(/<link[^>]*rel="canonical"[^>]*>/, h));
  console.log("  og:title:", m0(/<meta[^>]*property="og:title"[^>]*\/?>/, h));
  console.log("  twitter:title:", m0(/<meta[^>]*name="twitter:title"[^>]*\/?>/, h));
  console.log("  og:url:", m0(/<meta[^>]*property="og:url"[^>]*\/?>/, h));
  console.log("  title tag:", m0(/<title>[^<]*<\/title>/, h));
}

console.log("\n=== metadata across routes ===");
for (const r of ["/", "/stocks", "/news", "/rishis", "/pulse", "/forex", "/commodities", "/bonds"]) {
  const h = all[r].html;
  console.log(`  ${r}:`);
  console.log(`    title: ${m0(/<title>[^<]*<\/title>/, h)}`);
  console.log(`    canonical: ${m0(/<link[^>]*rel="canonical"[^>]*>/, h)}`);
  console.log(`    og:title: ${m0(/<meta[^>]*property="og:title"[^>]*\/?>/, h).slice(0, 140)}`);
  console.log(`    og:url: ${m0(/<meta[^>]*property="og:url"[^>]*\/?>/, h).slice(0, 140)}`);
  console.log(`    twitter:title: ${m0(/<meta[^>]*name="twitter:title"[^>]*\/?>/, h).slice(0, 140)}`);
}

console.log("\n=== /pricing + /rishis counts ===");
{
  const ph = all["/pricing"].html;
  const i = ph.search(/21[^0-9][\s\S]{0,80}Rishi|Rishi[\s\S]{0,80}21/);
  console.log("  pricing '21' context:", i >= 0 ? JSON.stringify(ph.slice(Math.max(0, i - 120), i + 160)) : "(no 21-near-Rishi)");
  const sh = all["/rishis"].html;
  const names = ["Buffett", "Munger", "Lynch", "Klarman", "Marks", "Templeton", "Fisher", "Schloss", "Pabrai", "Kedia", "Damani", "Porinju", "Kacholia", "Jhunjhunwala", "Agrawal", "Maheshwari", "Greenblatt", "Soros", "Graham", "Ackman"];
  const present = names.filter((n) => new RegExp(n).test(sh));
  console.log("  /rishis personas present:", present.length, "->", present.join(","));
  console.log("  /stocks 'top-5' context:", JSON.stringify((() => { const i = all["/stocks"].html.search(/top.?5/i); return all["/stocks"].html.slice(Math.max(0, i - 80), i + 120); })()));
}

console.log("\n=== /methodology leaks ===");
{
  const h = all["/methodology"].html;
  console.log("  'S2-' occurrences:", (h.match(/S2-\d+/g) || []).length);
  console.log("  'basant' occurrences:", (h.match(/basant/gi) || []).length);
  const i = h.search(/S2-\d+/);
  if (i >= 0) console.log("  first S2 context:", JSON.stringify(h.slice(i - 100, i + 100)));
}

console.log("\n=== probe2 complete ===");
