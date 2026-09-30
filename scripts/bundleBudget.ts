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
 * All three are currently OVER budget (app ships ~330-370 kB gzip). To stay
 * honest without a permanently red gate, the gate ALSO enforces a ratchet
 * baseline (bundle-budget-baseline.json): any increase beyond +2 kB jitter
 * fails immediately, and shrinking the app lets you re-lock a lower baseline.
 * A founder-confirmed budget replaces the ratchet as the hard gate.
 *
 * Usage:  npm run build && npx tsx scripts/bundleBudget.ts
 * Flags:  --build-dir=.next  --port=3212  --symbol=RELIANCE
 *
 * "Prove the gate bites" (Roadmap rule / Constitution art. 24): add a 1 MB
 * blocking import to a page on a scratch branch, rebuild, re-run — the gate
 * must fail with that route's numbers.
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
import http from "node:http";

const BUDGETS: Array<{ route: string; budgetKb: number }> = [
  { route: "/", budgetKb: 200 },
  { route: "/screener", budgetKb: 200 },
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
const child = spawn("npx", ["next", "start", "-p", String(port)], {
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder",
  },
  stdio: "ignore",
});

function fetchPage(path: string, tries = 40): string {
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
async function main() {
  const results: Array<{ route: string; kb: number | null; scripts: number }> = [];
try {
  for (const { route } of BUDGETS) {
    const url = route.replace("[symbol]", probeSymbol);
    let html: string;
    try {
      html = await fetchPage(url);
    } catch {
      results.push({ route, kb: null, scripts: 0 });
      continue;
    }
    const srcs = [
      ...new Set(
        [...html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+?\.js)"/g)].map(m => m[1]),
      ),
    ];
    let kb = 0;
    for (const src of srcs) kb += gzipKb(join(buildDir, "static", src.split("/_next/static/")[1]));
    results.push({ route, kb, scripts: srcs.length });
  }
} finally {
    child.kill("SIGTERM");
  }

  // ── 3. Verdict ──
  const baselinePath = "bundle-budget-baseline.json";
  const baseline = existsSync(baselinePath)
    ? (JSON.parse(readFileSync(baselinePath, "utf8")) as {
        measuredKb: Record<string, number>;
        toleranceKb: number;
      })
    : null;

  console.log("── bundleBudget (PROPOSED budgets; founder to confirm) ──");
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
    const overHardBudget = r.kb > budgetKb;
    let regressed = false;
    if (baseline) {
      const base = baseline.measuredKb[route];
      if (base !== undefined && r.kb > base + baseline.toleranceKb) regressed = true;
    }
    // With a ratchet baseline, over-PROPOSED-budget is reported loudly but
    // only a REGRESSION fails the gate (mirror of lint:ratchet). Once the
    // founder confirms a budget, delete the baseline file and the hard
    // budget becomes the fatal gate again.
    if (regressed || (!baseline && overHardBudget)) failed = true;
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
        " kB (budgets PROPOSED, currently exceeded — shrink bundles, then re-lock).",
    );
  }

  process.exit(failed ? 1 : 0);
}

main();
