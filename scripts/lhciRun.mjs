#!/usr/bin/env node
// scripts/lhciRun.mjs — U3 (founder round 7): the Lighthouse gate.
//
// Boots the production server, WARMES every audited route (a Lighthouse run
// against a cold first-render can crash the tab — an infrastructure failure,
// not a regression), runs the Lighthouse CLI per route, then ASSERTS the
// category scores and key metrics against the floors in lighthouserc.json.
// Exit 1 on any error-level breach — the gate bites.
//
// Chrome resolution: CHROME_PATH env (the CI job exports the Playwright
// chromium path). Flags are container-safe (--no-sandbox etc.).
//
// The floors are RATCHET baselines set from measured runs (recorded in the
// PR evidence): performance 0.69 worst measured (screener — its 1.4 MB
// slim-index payload is a known design; a founder-confirmed budget may
// tighten this later), a11y 0.95, best-practices 0.96, seo 1.0. Deliberate
// regressions below the floors fail CI; improvements re-lock the floors.
import { spawn, execFileSync } from "node:child_process";
import http from "node:http";
import { readFileSync, mkdirSync, existsSync } from "node:fs";

const PORT = 3220;
const URLS = ["/", "/screener", "/stock/RELIANCE"];
const OUT_DIR = ".lighthouseci";
const CONFIG = "lighthouserc.json";

// Read the assertion floors from lighthouserc.json — ONE source of truth.
const cfg = JSON.parse(readFileSync(CONFIG, "utf8")).assertions;
function floor(name, prop) {
  const a = cfg[name];
  if (!a) return null;
  const [, opts] = a;
  return opts?.[prop] ?? null;
}
const FLOORS = {
  performance: floor("categories:performance", "minScore") * 100,
  accessibility: floor("categories:accessibility", "minScore") * 100,
  "best-practices": floor("categories:best-practices", "minScore") * 100,
  seo: floor("categories:seo", "minScore") * 100,
  lcpMs: floor("largest-contentful-paint", "maxNumericValue"),
  cls: floor("cumulative-layout-shift", "maxNumericValue"),
  totalBytes: floor("total-byte-weight", "maxNumericValue"),
};

if (!process.env.CHROME_PATH || !existsSync(process.env.CHROME_PATH)) {
  console.error(`BLOCKED: CHROME_PATH must point to a Chrome binary (got: ${process.env.CHROME_PATH ?? "unset"})`);
  process.exit(2);
}

function waitFor(url, tries = 60) {
  return new Promise((resolve, reject) => {
    const attempt = (left) => {
      const req = http.get({ host: "127.0.0.1", port: PORT, path: url, timeout: 8000 }, (res) => {
        res.resume();
        if ((res.statusCode ?? 500) < 400) return resolve();
        if (left <= 0) return reject(new Error(`${url} never answered OK`));
        setTimeout(() => attempt(left - 1), 1000);
      });
      req.on("error", () => {
        if (left <= 0) return reject(new Error(`${url}: server never came up`));
        setTimeout(() => attempt(left - 1), 1000);
      });
      req.on("timeout", () => req.destroy(new Error("timeout")));
    };
    attempt(tries);
  });
}

const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder",
  },
  stdio: "ignore",
});

const results = [];
try {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const u of URLS) {
    await waitFor(u);
  }
  console.log(`[lhciRun] server warmed on :${PORT}`);

  let i = 0;
  for (const u of URLS) {
    const out = `${OUT_DIR}/route-${i}.json`;
    execFileSync("npx", [
      "lighthouse", `http://localhost:${PORT}${u}`,
      "--preset=desktop", "--quiet",
      "--output=json", `--output-path=${out}`,
      `--chrome-flags=--headless=new --no-sandbox --disable-dev-shm-usage --disable-gpu`,
    ], { stdio: "inherit", env: { ...process.env } });
    results.push({ url: u, report: JSON.parse(readFileSync(out, "utf8")) });
    i += 1;
  }
} finally {
  server.kill("SIGTERM");
}

// ── Assert ──────────────────────────────────────────────────────────
console.log("\n── Lighthouse gate (floors from lighthouserc.json) ──");
let failed = false;
for (const { url, report } of results) {
  const cats = Object.fromEntries(
    Object.values(report.categories).map((c) => [c.id, (c.score ?? 0) * 100]),
  );
  const lcp = report.audits["largest-contentful-paint"]?.numericValue ?? 0;
  const cls = report.audits["cumulative-layout-shift"]?.numericValue ?? 0;
  const bytes = report.audits["total-byte-weight"]?.numericValue ?? 0;
  const row = (label, value, floorValue, unit, breach) => {
    const mark = breach ? "FAIL" : "ok";
    if (breach) failed = true;
    return `  ${label.padEnd(14)} ${String(value).padStart(7)} ${unit}  (floor ${floorValue})  ${mark}`;
  };
  console.log(`■ ${url}`);
  console.log(row("performance", cats.performance.toFixed(0), FLOORS.performance, "score", cats.performance < FLOORS.performance));
  console.log(row("accessibility", cats.accessibility.toFixed(0), FLOORS.accessibility, "score", cats.accessibility < FLOORS.accessibility));
  console.log(row("best-practices", cats["best-practices"].toFixed(0), FLOORS["best-practices"], "score", cats["best-practices"] < FLOORS["best-practices"]));
  console.log(row("seo", cats.seo.toFixed(0), FLOORS.seo, "score", cats.seo < FLOORS.seo));
  console.log(row("LCP", Math.round(lcp), FLOORS.lcpMs, "ms", lcp > FLOORS.lcpMs));
  console.log(row("CLS", cls.toFixed(4), FLOORS.cls, "", cls > FLOORS.cls));
  console.log(row("byte-weight", Math.round(bytes), FLOORS.totalBytes, "B", bytes > FLOORS.totalBytes));
}

if (failed) {
  console.error("\nLighthouse gate: FAIL — a floor was breached.");
  process.exit(1);
}
console.log("\nLighthouse gate: PASS — every floor held.");
