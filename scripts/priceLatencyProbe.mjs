#!/usr/bin/env node
/**
 * LP2 (founder directives 8+18, 2026-10-06) — the user-facing price-latency
 * probe for the /stocks table. Constitution C10: the page is the metric.
 *
 * What it measures (one run = one full observation of the table filling):
 *   - time to FIRST price rendered in the table (TTFP);
 *   - time to 25% / 50% / 75% / 100% table coverage;
 *   - the /api/prices/batch wire as it happens: per response, the symbol
 *     count and the per-symbol provenance split (LIVE = an upstream refresh
 *     landed during THIS request; CACHED = served from the shared cache;
 *     UNAVAILABLE = honest miss) — the cache-hit vs upstream-refresh
 *     contribution, measured on the real page, not inferred;
 *   - wall time to the final coverage plateau.
 *
 * Usage: node scripts/priceLatencyProbe.mjs [BASE_URL] [OUT_JSON] [MAX_SECONDS]
 * Exit 0 always (measurement artifact — it reports, it does not gate).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const BASE = process.argv[2] || "https://rishi-terminal.vercel.app";
const OUT =
  process.argv[3] ||
  join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "evidence", "round19", "price-latency-probe.json");
const MAX_MS = Number(process.argv[4] || 420) * 1000;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const t0 = Date.now();
const batchResponses = [];
page.on("response", async (res) => {
  if (!res.url().includes("/api/prices/batch")) return;
  try {
    const body = await res.json();
    const prices = body?.prices ?? {};
    const split = { LIVE: 0, CACHED: 0, UNAVAILABLE: 0, other: 0 };
    for (const v of Object.values(prices)) {
      const st = v?.status;
      if (st === "LIVE") split.LIVE += 1;
      else if (st === "CACHED") split.CACHED += 1;
      else if (st === "UNAVAILABLE") split.UNAVAILABLE += 1;
      else split.other += 1;
    }
    batchResponses.push({
      tMs: Date.now() - t0,
      http: res.status(),
      symbols: Object.keys(prices).length,
      split,
    });
  } catch {
    batchResponses.push({ tMs: Date.now() - t0, http: res.status(), parse: "failed" });
  }
});

await page.goto(`${BASE}/stocks`, { waitUntil: "domcontentloaded", timeout: 60_000 });

// Sample the table's rendered coverage every 500 ms until the plateau
// (no growth for 10 s) or MAX_MS — whichever comes first.
const coverage = [];
let lastCount = -1;
let plateauSince = null;
let firstPriceMs = null;
let finalCount = 0;

const sample = async () => {
  const n = await page.evaluate(() => {
    const rows = document.querySelectorAll("table tbody tr");
    let priced = 0;
    for (const r of rows) {
      // A row counts as priced ONLY when its live-price cell
      // (title="Live price …") shows a positive number — the PE/ROE/score
      // cells are seed-classified and stay populated while the price is an
      // em dash (the founder's screenshot defect this probe measures).
      const cell = Array.from(r.querySelectorAll("td")).find((c) =>
        (c.getAttribute("title") || "").startsWith("Live price"),
      );
      if (!cell) continue;
      const t = (cell.textContent || "").trim().replace(/[₹,]/g, "");
      if (/^\d+(\.\d+)?$/.test(t) && Number(t) > 0) priced += 1;
    }
    return { rows: rows.length, priced };
  });
  const tMs = Date.now() - t0;
  if (n.priced > 0 && firstPriceMs === null) firstPriceMs = tMs;
  coverage.push({ tMs, rows: n.rows, priced: n.priced });
  finalCount = Math.max(finalCount, n.priced);
  if (n.priced !== lastCount) {
    lastCount = n.priced;
    plateauSince = tMs;
  }
  return n.priced;
};

let plateauReached = false;
let lastWireAt = 0;
while (Date.now() - t0 < MAX_MS) {
  await sample();
  const lastWire = batchResponses[batchResponses.length - 1];
  if (lastWire) lastWireAt = lastWire.tMs;
  // Quiet = the wire went silent AND the DOM stopped moving for 20 s
  // (a plateau in coverage alone is not quiet — later chunks may still land).
  const quietFor = Date.now() - t0 - Math.max(plateauSince ?? 0, lastWireAt);
  if (quietFor > 20_000 && lastWireAt > 0) {
    plateauReached = true;
    break;
  }
  await new Promise((r) => setTimeout(r, 500));
}

await browser.close();

const pct = (p) => {
  const hit = coverage.find((c) => c.priced >= p * finalCount && finalCount > 0);
  return hit ? hit.tMs : null;
};

const wire = batchResponses.reduce(
  (a, r) => {
    if (r.split) {
      a.responses += 1;
      a.symbols += r.symbols ?? 0;
      a.LIVE += r.split.LIVE ?? 0;
      a.CACHED += r.split.CACHED ?? 0;
      a.UNAVAILABLE += r.split.UNAVAILABLE ?? 0;
    }
    return a;
  },
  { responses: 0, symbols: 0, LIVE: 0, CACHED: 0, UNAVAILABLE: 0 },
);

const artifact = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE,
  maxSeconds: MAX_MS / 1000,
  plateauReached,
  firstPriceMs,
  finalCoverage: finalCount,
  timeToPct: { p25: pct(0.25), p50: pct(0.5), p75: pct(0.75), p100: pct(1.0) },
  wire,
  batchResponses,
  coverageEvery500ms: coverage.filter((_, i) => i % 4 === 0 || i === coverage.length - 1),
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(artifact, null, 2));
console.log(JSON.stringify({
  firstPriceMs,
  finalCoverage: finalCount,
  timeToPct: artifact.timeToPct,
  plateauReached,
  wire: { responses: wire.responses, LIVE: wire.LIVE, CACHED: wire.CACHED, UNAVAILABLE: wire.UNAVAILABLE },
}, null, 1));
