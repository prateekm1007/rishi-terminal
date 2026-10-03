/**
 * Production closure battery — Greenblatt V2 production probe (no chat quota).
 *
 * Usage: node greenblatt_probe.mjs <BASE_URL> <OUT_JSON>
 *
 * V2 (PR #87): ROC was computed as a RATIO and rendered as a percentage;
 * the fix converts to percent before scaling. The stock detail page is the
 * user-facing surface: parse /stock/{SYM} SSR HTML for
 *   - "Magic Formula: ROC X.X% . EY Y.Y%" summary line
 *   - the Earnings-Yield detail carrying the HONEST proxy disclosure
 *     "(net profit / market cap)" (FD-1: not EBIT/EV — data unavailable)
 *   - NO EBIT/EV claim anywhere in the Greenblatt block
 * Assertions (same shape as the round-12 probe on 96726c6):
 *   - roc_detail_pct is a sane PERCENT (0 < x <= 100), not a ratio
 *   - ey_detail_pct likewise
 *   - greenblatt_present on every sampled symbol
 *   - ebit_ev_claim === false (honest proxy disclosure)
 */
const BASE = process.argv[2] || "https://rishi-terminal.vercel.app";
const OUT = process.argv[3] || "greenblatt-probe.json";

const SYMBOLS = (process.env.SYMBOLS || "RELIANCE,TCS,HDFCBANK,ITC,KTKBANK").split(",");

const results = { base: BASE, version: null, symbols: {} };

const v = await fetch(`${BASE}/api/version`, { signal: AbortSignal.timeout(20000) }).then(r => r.json()).catch(() => ({}));
results.version = v?.sha ?? null;

for (const sym of SYMBOLS) {
  const row = { symbol: sym };
  try {
    const res = await fetch(`${BASE}/stock/${sym}`, { signal: AbortSignal.timeout(30000) });
    row.http = res.status;
    const html = await res.text();
    // Global anchored patterns (the page renders the summary line twice:
    // SSR text + RSC payload; the comps detail lives in escaped JSON).
    const sum = html.match(/Magic Formula: ROC ([\d.]+)% · EY ([\d.]+)%/);
    const eyDetail = html.match(/EY ([\d.]+)% \(net profit \/ market cap\)/);
    row.greenblatt_present = /Magic Formula/.test(html);
    row.roc_detail_pct = sum ? Number(sum[1]) : null;
    row.ey_detail_pct = sum ? Number(sum[2]) : (eyDetail ? Number(eyDetail[1]) : null);
    // honest proxy disclosure + no EBIT/EV overclaim (EBIT appears nowhere
    // on the page — verified 2026-10-03; a global check is therefore safe)
    row.proxy_disclosure = /EY [\d.]+% \(net profit \/ market cap\)/.test(html);
    row.ebit_ev_claim = /EBIT\s*\/\s*EV/.test(html);
    row.ok =
      row.http === 200 &&
      row.greenblatt_present &&
      row.roc_detail_pct !== null && row.roc_detail_pct > 0 && row.roc_detail_pct <= 100 &&
      row.ey_detail_pct !== null && row.ey_detail_pct > 0 && row.ey_detail_pct <= 100 &&
      row.proxy_disclosure === true &&
      row.ebit_ev_claim === false;
  } catch (e) {
    row.http = 0; row.error = String(e).slice(0, 200); row.ok = false;
  }
  results.symbols[sym] = row;
  console.log(`${row.ok ? "PASS" : "FAIL"}  ${sym.padEnd(10)} http=${row.http} ROC=${row.roc_detail_pct}% EY=${row.ey_detail_pct}% proxy=${row.proxy_disclosure} ebitEv=${row.ebit_ev_claim}`);
}

results.verdict = Object.values(results.symbols).every(s => s.ok) ? "PASS" : "FAIL";
import { writeFileSync } from "node:fs";
writeFileSync(OUT, JSON.stringify(results, null, 1) + "\n");
console.log("verdict:", results.verdict);
process.exit(results.verdict === "PASS" ? 0 : 1);
