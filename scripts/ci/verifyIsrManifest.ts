// scripts/ci/verifyIsrManifest.ts — Y1 (Round 12) post-build gate.
//
// The Y1 acceptance says the build route table must show / and
// /stock/[symbol] as SSG/ISR (●), never ƒ (Dynamic). The printed table is
// text; the MECHANICAL source of truth is .next/prerender-manifest.json:
//   - an ISR page appears under `routes` with a numeric `revalidate`;
//   - a dynamic-params SSG route appears under `dynamicRoutes` and its
//     baked paths appear under `routes`.
// On main @ 9a3e682 (X3 force-dynamic state) neither entry exists — this
// gate was run against that state first and FAILED (rule 24 bite proof,
// see docs/evidence/round12/y1-fast-pages.md).
//
// Usage: npm run build && npm run verify:isr
// Exit codes: 0 = PASS, 1 = FAIL.

import { readFileSync } from "node:fs";
import path from "node:path";

interface PrerenderRoute {
  dataRoute?: string;
  /** Next 16.2 (manifest version 4) — the baked revalidate window in
   *  seconds. Absent on dynamicRoutes TEMPLATES (only baked routes carry
   *  it — verified against a real `npm run build` output). */
  initialRevalidateSeconds?: number;
  [k: string]: unknown;
}

interface PrerenderManifest {
  version: number;
  routes: Record<string, PrerenderRoute>;
  dynamicRoutes: Record<string, PrerenderRoute>;
}

const REvalidateCap = 60; // Y1: revalidate <= 60 s

function fail(msg: string): never {
  console.error(`ISR manifest gate: FAIL — ${msg}`);
  process.exit(1);
}

const manifestPath = path.resolve(".next/prerender-manifest.json");
let raw: string;
try {
  raw = readFileSync(manifestPath, "utf8");
} catch {
  fail(`${manifestPath} not found — run \`npm run build\` before this gate`);
}

let manifest: PrerenderManifest;
try {
  manifest = JSON.parse(raw) as PrerenderManifest;
} catch (e) {
  fail(`cannot parse ${manifestPath}: ${e instanceof Error ? e.message : e}`);
}

function revalidateOk(r: PrerenderRoute | undefined, name: string): void {
  if (!r) fail(`${name} is absent from the prerender manifest (route is dynamic?)`);
  const v = r.initialRevalidateSeconds;
  if (typeof v !== "number" || !Number.isFinite(v)) {
    fail(`${name} initialRevalidateSeconds is ${String(v)} — expected a numeric value <= ${REvalidateCap} (Y1 cap)`);
  }
  if (v > REvalidateCap) {
    fail(`${name} initialRevalidateSeconds is ${v}s — above the Y1 cap of ${REvalidateCap}s`);
  }
}

// 1. Home: baked and revalidating (Next 16 v4 manifest:
//    initialRevalidateSeconds; the route table prints it as "1m").
revalidateOk(manifest.routes["/"], "/");

// 2. Stock template: the on-demand ISR route must exist. The TEMPLATE
//    carries no revalidate field in the v4 manifest — the cap is
//    enforced per baked route below (execute-don't-assume: verified
//    against the real build output on this branch).
if (!manifest.dynamicRoutes["/stock/[symbol]"]) {
  fail("/stock/[symbol] is absent from dynamicRoutes (route is dynamic?)");
}

// 3. The universe is actually baked: at least one /stock/<SYM> route with
//    the cap respected. Every baked stock route must respect the cap.
const bakedStock = Object.entries(manifest.routes)
  .filter(([p]) => p.startsWith("/stock/"))
  .map(([p, r]) => [p, r.initialRevalidateSeconds] as const);
if (bakedStock.length === 0) {
  fail("no /stock/<SYMBOL> routes baked — generateStaticParams did not run");
}
for (const [p, v] of bakedStock) {
  if (typeof v !== "number" || v > REvalidateCap) {
    fail(`baked route ${p} initialRevalidateSeconds is ${String(v)} — above the Y1 cap or non-numeric`);
  }
}

console.log(
  `ISR manifest gate: PASS — / initialRevalidateSeconds=${String(manifest.routes["/"]?.initialRevalidateSeconds)}s, ` +
    `/stock/[symbol] template present, ` +
    `${bakedStock.length} baked stock routes (cap ${REvalidateCap}s)`,
);
