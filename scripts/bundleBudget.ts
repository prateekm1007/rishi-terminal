/**
 * bundleBudget.ts (E6-02) — fail when first-load JS exceeds budget.
 *
 * Next.js 16 (Turbopack) no longer prints per-route sizes, and its manifests
 * over-approximate (they list SSR-side references too). So this gate measures
 * GROUND TRUTH: it builds, boots `next start`, fetches each route, collects
 * the `<script src="/_next/static/chunks/*.js">` tags the browser actually
 * downloads for first load, and gzip-sizes that set.
 *
 * Default budgets (PROPOSED — founder to confirm per the Roadmap rule; the
 * stock page ≤ 200 KB gzip comes from the roadmap itself):
 *     /                ≤ 200 kB
 *     /screener        ≤ 200 kB
 *     /stock/[symbol]  ≤ 200 kB
 *
 * B4 (founder Round-15): the founder's directive "Reduce /stock/[symbol]
 * to ≤ 200 kB gzip" confirms the 200 kB budget as operative — the ratchet
 * baseline file is REMOVED and the hard budgets are the fatal gate.
 *
 * B4 measurement correction (the defect this fixes): the gate used to
 * count EVERY <script src> tag, including the `noModule` legacy polyfill
 * chunk (core-js, ~38 kB gzip) that NO module-capable browser downloads
 * — Next emits it only for browsers outside its support matrix (Next 16
 * docs, supported-browsers.md). Chromium network captures prove the
 * chunk is never requested (docs/evidence/round15/b4-bundle-budget.md).
 * The gate now measures what its docstring always claimed: the scripts a
 * supported browser actually downloads for first load.
 *
 * History: the app once shipped ~330–370 kB gzip per route; the Z5 diet
 * and the A1 content-restoration moved the measured values to ~197–207 kB.
 * B4 (Round 15) corrected the MEASUREMENT (see above) — the real
 * first-load for supported browsers is ~159–169 kB, inside the 200 kB
 * budgets, so the hard budgets are the fatal gate and the ratchet
 * baseline file is removed (re-add it only with founder approval to
 * guard a transition period).
 *
 * Usage:  npm run build && npx tsx scripts/bundleBudget.ts
 * Flags:  --build-dir=.next  --port=3212  --symbol=RELIANCE
 *
 * "Prove the gate bites" (Roadmap rule / Constitution art. 24): add a 1 MB
 * blocking import to a page on a scratch branch, rebuild, re-run — the gate
 * must fail with that route's numbers.
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
import http from "node:http";

const BUDGETS: Array<{ route: string; budgetKb: number }> = [
  { route: "/", budgetKb: 200 },
  { route: "/stocks", budgetKb: 200 }, // G2 (founder Round-22): the canonical Stocks surface (was /screener)
  { route: "/stock/[symbol]", budgetKb: 200 }, // PROPOSED in the roadmap
];

const argv = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, ...rest] = a.replace(/^--/, "").split("=");
    return [k, rest.join("=") || "true"];
  }),
);
const buildDir = (argv["build-dir"] as string) ?? ".next";
const port = Number(argv["port"] ?? 3212);
const probeSymbol = (argv["symbol"] as string) ?? "RELIANCE";

function gzipKb(file: string): number {
  return gzipSync(readFileSync(file)).length / 1024;
}

// ── 0. Build if needed ──
if (!existsSync(join(buildDir, "BUILD_ID"))) {
  console.log("No build output found — running `next build`…");
  const res = spawnSync("npx", ["next", "build"], { stdio: "inherit" });
  if (res.status !== 0) {
    console.error("BLOCKED: next build failed — fix the build before budgeting bundles");
    process.exit(res.status ?? 1);
  }
}

// ── 1. Boot next start (placeholder env — measurement must not need secrets) ──
// A1 fix (Round 14): spawn DETACHED and kill the whole PROCESS GROUP. The
// previous `spawn("npx", …)` + child.kill(“SIGTERM”) killed only the npx
// shim — the real `next start` grandchild survived every run, held port
// 3212, and served the PREVIOUS build's HTML to the next invocation (the
// auditor-visible symptom: gzipKb ENOENT on chunk names that no longer
// exist). Fail-honest: if the group kill cannot find the group, fall
// through to the direct kill.
const child = spawn("npx", ["next", "start", "-p", String(port)], {
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder",
  },
  stdio: "ignore",
  detached: true,
});

function fetchPage(path: string, tries = 40): Promise<string> {
  return new Promise((resolve, reject) => {
    const attempt = (left: number) => {
      const req = http.get(
        { host: "127.0.0.1", port, path, timeout: 4000 },
        res => {
          if ((res.statusCode ?? 500) >= 400 && left > 0) {
            res.resume();
            return setTimeout(() => attempt(left - 1), 500);
          }
          let body = "";
          res.setEncoding("utf8");
          res.on("data", d => (body += d));
          res.on("end", () => resolve(body));
        },
      );
      req.on("error", () => {
        if (left <= 0) reject(new Error(`server never came up for ${path}`));
        else setTimeout(() => attempt(left - 1), 500);
      });
      req.on("timeout", () => req.destroy(new Error("timeout")));
    };
    attempt(tries);
  });
}

// ── 2. Measure each route ──
// A1 robustness (Round 14): a page fetch is only TRUSTED when every
// <script src> it references exists on disk. During `next start` boot the
// server can transiently answer with HTML whose chunk refs do not match
// the build on disk (boot race), which used to crash the gate with a
// gzipKb ENOENT. Fail-honest: refetch, and only give up after the retry
// budget — a genuinely broken build still fails the gate loudly.

/** B4: extract the first-load chunk srcs from a page's HTML.
 * `noModule` script tags (the legacy-browser core-js polyfill chunk) are
 * EXCLUDED — module-capable browsers never download them, so they are not
 * first-load JS for any supported browser (attribute matching is
 * case-insensitive: React SSR emits `noModule`, the DOM normalizes to
 * `nomodule`). */
function firstLoadChunkSrcs(html: string): string[] {
  return [
    ...new Set(
      [...html.matchAll(/<script\b[^>]*>/g)]
        .map((m) => m[0])
        .filter((tag) => !/\bnomodule\b/i.test(tag))
        .flatMap((tag) => [...tag.matchAll(/src="(\/_next\/static\/chunks\/[^"]+?\.js)"/g)].map((m) => m[1])),
    ),
  ];
}

function chunkMissing(html: string): boolean {
  const srcs = [
    ...new Set(
      [...html.matchAll(/src="(\/_next\/static\/chunks\/([^"]+?\.js))"/g)].map(m => m[2]),
    ),
  ];
  return srcs.some(src => !existsSync(join(buildDir, "static", "chunks", src)));
}

async function fetchPageStable(path: string): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    const html = await fetchPage(path, attempt === 0 ? 40 : 10);
    if (!chunkMissing(html) || attempt >= 5) return html;
    console.log(`  (${path}: served HTML referenced chunks missing on disk — boot race, refetching)`);
  }
}

async function main() {
  const results: Array<{ route: string; kb: number | null; scripts: number }> = [];
try {
  for (const { route } of BUDGETS) {
    const url = route.replace("[symbol]", probeSymbol);
    let html: string;
    try {
      html = await fetchPageStable(url);
    } catch {
      results.push({ route, kb: null, scripts: 0 });
      continue;
    }
    const srcs = firstLoadChunkSrcs(html);
    let kb = 0;
    for (const src of srcs) kb += gzipKb(join(buildDir, "static", src.split("/_next/static/")[1]));
    results.push({ route, kb, scripts: srcs.length });
  }
} finally {
    try {
      if (child.pid !== undefined) process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
  }

  // ── 3. Verdict ──
  const baselinePath = "bundle-budget-baseline.json";
  // --update-baseline re-locks the ratchet to the CURRENT measurements.
  // Only honest after a passing run that is not a regression: re-locking
  // a regression would rubber-stamp growth.
  const updateBaseline = process.argv.includes("--update-baseline");
  const baseline = existsSync(baselinePath)
    ? (JSON.parse(readFileSync(baselinePath, "utf8")) as {
        measuredKb: Record<string, number>;
        toleranceKb: number;
      })
    : null;

  console.log("── bundleBudget (200 kB budgets — founder-confirmed in Round-15 B4; first-load = scripts a module-capable browser downloads, nomodule polyfills excluded) ──");
  console.log("route                first-load   budget   ratchet   verdict");
  let failed = false;
  for (let i = 0; i < BUDGETS.length; i++) {
    const { route, budgetKb } = BUDGETS[i];
    const r = results[i];
    if (r.kb === null) {
      console.log(`${route.padEnd(20)} UNREACHABLE (${probeSymbol}) — route failed to render`);
      failed = true;
      continue;
    }
    // G2 positive control (founder Round-22): a "measured" route with NO
    // first-load script (0 scripts / 0 kB) is a missing or redirecting
    // page — e.g. /screener 308-redirects to /stocks and its empty
    // response would otherwise pass silently. A page that renders no
    // first-load JS must FAIL the gate, never bless emptiness.
    if (r.scripts === 0 || !(r.kb > 0)) {
      console.log(`${route.padEnd(20)} ${r.kb.toFixed(1).padStart(8)} kB ${String(budgetKb).padStart(6)} kB       —    NO FIRST-LOAD JS (${r.scripts} scripts) — positive control FAILED`);
      failed = true;
      continue;
    }
    const overHardBudget = r.kb > budgetKb;
    let regressed = false;
    if (baseline) {
      const base = baseline.measuredKb[route];
      if (base !== undefined && r.kb > base + baseline.toleranceKb) regressed = true;
    }
    // C3 (founder Round 16): the ratchet and the hard cap are FATAL
    // alongside each other — a regression beyond +2 kB of the locked
    // values fails the gate, and so does crossing the 200 kB hard budget
    // ("Restore a ratchet baseline at the measured values ... alongside
    // the 200 kB hard cap"). Before this PR, a present baseline silenced
    // the hard cap entirely; that made the cap decoration, not a gate.
    if (regressed || overHardBudget) failed = true;
    const verdict = regressed
      ? "REGRESSION vs ratchet"
      : overHardBudget
        ? "over proposed budget"
        : "OK";
    const ratchetCell = baseline?.measuredKb[route]?.toFixed(1)?.padStart(7) ?? "    —";
    console.log(
      `${route.padEnd(20)} ${r.kb.toFixed(1).padStart(8)} kB ${String(budgetKb).padStart(6)} kB ${ratchetCell} kB   ${verdict}  (${r.scripts} scripts)`,
    );
  }
  if (baseline) {
    console.log(
      "Ratchet: fails on increase beyond +" +
        baseline.toleranceKb +
        " kB, and the 200 kB hard budget stays fatal alongside it (C3, founder Round 16).",
    );
  }

  if (updateBaseline) {
    if (failed) {
      console.error(
        "--update-baseline refused: the current run fails the gate — fix the regression first (re-locking growth defeats the ratchet).",
      );
      process.exit(1);
    }
    const measured: Record<string, number> = {};
    for (let i = 0; i < BUDGETS.length; i++) {
      if (results[i].kb !== null) measured[BUDGETS[i].route] = results[i].kb as number;
    }
    const toleranceKb = baseline?.toleranceKb ?? 2;
    const note =
      "bundle ratchet baseline (E6-02, restored by C3). Values are gzip kB of first-load JS measured from the HTML script tags of a production build (module-capable browser, nomodule excluded — B4 measurement). Founder Round 16: the ratchet fails on any increase beyond +2 kB AND the 200 kB hard budget stays fatal alongside it. Re-lock only with --update-baseline after a passing, non-regressing run.";
    writeFileSync(
      baselinePath,
      JSON.stringify({ note, toleranceKb, measuredKb: measured }, null, 1) + "\n",
    );
    console.log("Baseline re-locked to the current measurements.");
  }

  process.exit(failed ? 1 : 0);
}

main();
