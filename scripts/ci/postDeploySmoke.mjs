#!/usr/bin/env node
// scripts/ci/postDeploySmoke.mjs — Constitution v2 C6 ("done = merged +
// deployed + LIVE") and C10 (positive controls), answering founder Round-15
// B1: a post-deploy smoke that FAILS when the production HTML lacks the
// first-byte content sections.
//
// Why this exists (B-20/B-21 lineage): "merged" was reported done twice
// while production still served the pre-fix build. A smoke that only runs
// against a LOCAL build (the Playwright job) cannot catch that class —
// this script runs against the DEPLOYED site.
//
// Calibration note (measured 2026-10-04, this is the point of the rewrite):
// the Round-14 acceptance `grep -c "Key Metrics\|..."` counts matching
// LINES, and the stock-page SSR HTML is ~14 lines (minified) — the command
// returns 2 on a FULLY FIXED page and can never reach the intended ">= 4".
// This script counts OCCURRENCES per pattern (grep -o | wc -l semantics),
// so a missing section cannot hide behind line geometry.
//
// Checks (each printed PASS/FAIL, any FAIL -> exit 1):
//   version   — /api/version serves JSON carrying a 40-hex sha; with
//               --expect-sha <sha> the live sha must equal it (C6).
//   sections  — /stock/SBIN and /stock/BANKBARODA each contain every
//               A1 first-byte section >= 1 occurrence:
//               Key Metrics, Peer Comparison, RISHI COMMENTARY,
//               Pillar Breakdown (positive controls by construction).
//   price     — "PRICE UNAVAILABLE" occurs 0 times on both pages, and the
//               page integrity control (<h1 ...>Rishi Terminal title) holds,
//               so the zero cannot come from a missing page (B-18).
//   nullzero  — /stock/BANDHANBNK: the Y4 placeholder-zero defect strings
//               ("Promoter Hold0.0%", "D/E Ratio0.0x") occur 0 times while
//               the MetricsPanel control ("hidden for banks") occurs >= 1.
//
// Usage:
//   node scripts/ci/postDeploySmoke.mjs [--base https://…] [--expect-sha <sha>]
//                                       [--section "Extra Section"]
//   --base        defaults to https://rishi-terminal.vercel.app
//   --expect-sha  fail unless /api/version sha equals this value
//   --section     add a REQUIRED section (used by the fail-first proof:
//                 a string that is not on the page must fail the run)
//
// Exit codes: 0 = smoke green, 1 = smoke FAILED, 2 = usage/transport error.

const DEFAULT_BASE = "https://rishi-terminal.vercel.app";

const SECTIONS = [
  "Key Metrics",
  "Peer Comparison",
  "RISHI COMMENTARY",
  "Pillar Breakdown",
];

const PAGES = ["/stock/SBIN", "/stock/BANKBARODA"];

// Y4 negative controls (BANDHANBNK): null must never render as a
// placeholder zero; the panel control proves the surface exists.
const NULLZERO_SYMBOL = "/stock/BANDHANBNK";
const NULLZERO_DEFECTS = ["Promoter Hold0.0%", "D/E Ratio0.0x"];
const NULLZERO_PANEL_CONTROL = "hidden for banks";

const argv = process.argv.slice(2);
let base = DEFAULT_BASE;
let expectSha = null;
const extraSections = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--base") base = argv[++i];
  else if (argv[i] === "--expect-sha") expectSha = argv[++i];
  else if (argv[i] === "--section") extraSections.push(argv[++i]);
  else {
    console.error(`post-deploy-smoke: unknown argument '${argv[i]}'`);
    process.exit(2);
  }
}

/** Count non-overlapping occurrences of `needle` in `haystack`
 * (String.split — the same semantics as `grep -o | wc -l`). */
function countOccurrences(haystack, needle) {
  if (!haystack.includes(needle)) return 0;
  return haystack.split(needle).length - 1;
}

async function fetchText(url, headers = {}) {
  const res = await fetch(url, {
    headers: { "Cache-Control": "no-cache", "user-agent": "post-deploy-smoke/1", ...headers },
    redirect: "follow",
  });
  const text = await res.text();
  return { status: res.status, text };
}

const failures = [];
const report = (ok, label, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? " — " + detail : ""}`);
  if (!ok) failures.push(`${label}${detail ? " — " + detail : ""}`);
};

// ── 1. /api/version ────────────────────────────────────────────────────────
let liveSha = null;
try {
  const r = await fetchText(`${base}/api/version?smoke=${Date.now()}`);
  let version = null;
  try {
    version = JSON.parse(r.text);
  } catch {
    /* handled below */
  }
  if (r.status !== 200 || !version || typeof version.sha !== "string" || !/^[0-9a-f]{40}$/.test(version.sha)) {
    report(false, "version", `HTTP ${r.status}, body not JSON with a 40-hex sha: ${r.text.slice(0, 120)}`);
  } else {
    liveSha = version.sha;
    if (expectSha && version.sha !== expectSha) {
      report(false, "version", `live sha ${version.sha.slice(0, 12)} != expected ${expectSha.slice(0, 12)}`);
    } else {
      report(true, "version", `live sha ${version.sha.slice(0, 12)}${expectSha ? " (matches expected)" : ""}`);
    }
  }
} catch (err) {
  report(false, "version", `transport error: ${err.message}`);
}

// ── 2/3. First-byte sections + price honesty on both probe pages ──────────
const requiredSections = [...SECTIONS, ...extraSections];
for (const page of PAGES) {
  try {
    const r = await fetchText(`${base}${page}?smoke=${Date.now()}`);
    if (r.status !== 200) {
      report(false, `sections ${page}`, `HTTP ${r.status}`);
      continue;
    }
    const html = r.text;

    // Page integrity control (B-18): a zero-count absence check is only
    // meaningful on a page that actually rendered.
    const hasH1 = /<h1[^>]*>/.test(html);
    const hasTitle = /Rishi Terminal/.test(html);
    report(hasH1 && hasTitle, `page-integrity ${page}`, `<h1 present: ${hasH1}; title marker: ${hasTitle}; ${html.length} bytes`);

    for (const section of requiredSections) {
      const n = countOccurrences(html, section);
      report(n >= 1, `section ${page} "${section}"`, `${n} occurrence(s)`);
    }

    const priceUnavail = countOccurrences(html, "PRICE UNAVAILABLE");
    report(priceUnavail === 0, `price ${page} "PRICE UNAVAILABLE"`, `${priceUnavail} occurrence(s) (must be 0)`);
  } catch (err) {
    report(false, `sections ${page}`, `transport error: ${err.message}`);
  }
}

// ── 4. Y4 null-not-zero on the bank page ──────────────────────────────────
try {
  const r = await fetchText(`${base}${NULLZERO_SYMBOL}?smoke=${Date.now()}`);
  if (r.status !== 200) {
    report(false, "nullzero BANDHANBNK", `HTTP ${r.status}`);
  } else {
    for (const defect of NULLZERO_DEFECTS) {
      const n = countOccurrences(r.text, defect);
      report(n === 0, `nullzero "${defect}"`, `${n} occurrence(s) (must be 0)`);
    }
    const panel = countOccurrences(r.text, NULLZERO_PANEL_CONTROL);
    report(panel >= 1, `nullzero panel control "${NULLZERO_PANEL_CONTROL}"`, `${panel} occurrence(s) (must be >= 1)`);
  }
} catch (err) {
  report(false, "nullzero BANDHANBNK", `transport error: ${err.message}`);
}

console.log(
  failures.length === 0
    ? `post-deploy-smoke: PASS (${base}${liveSha ? `, sha ${liveSha.slice(0, 12)}` : ""})`
    : `post-deploy-smoke: FAIL — ${failures.length} failed check(s)`
);
process.exit(failures.length === 0 ? 0 : 1);
