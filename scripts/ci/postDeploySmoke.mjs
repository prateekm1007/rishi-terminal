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
//   sections  — /stock/SBIN and /stock/BANKBARODA each carry the A1
//               first-byte anchors "Key Metrics" and "Peer Comparison",
//               AND satisfy the P0-1 verdict trichotomy (rule-23 re-pin,
//               founder audit 2026-10-11 "seed rows show no verdict"):
//               every page shows EXACTLY ONE of
//                 (a) the seed no-verdict record (then the verdict
//                     sections RISHI COMMENTARY / Pillar Breakdown must
//                     be ABSENT — the suppression is enforced, not
//                     assumed),
//                 (b) the whole-page insufficient-data record (missing
//                     class), or
//                 (c) the full verdict record (live/delayed data — both
//                     verdict sections present, no-verdict markers
//                     absent).
//               This is STRICTLY STRONGER than the pre-P0-1 probe: the
//               old probe asserted section presence only; the re-pin
//               also fails a seed page that still leaks a verdict
//               section, and fails any page showing neither record.
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

// A1 first-byte anchors that render on EVERY stock page regardless of
// the P0-1 data-quality class (the seed record keeps the provenance-
// labelled metrics and the peer table below it).
const ALWAYS_SECTIONS = [
  "Key Metrics",
  "Peer Comparison",
];

// Verdict-record sections — present ONLY when the record classifies
// live/delayed (verdicts allowed, lib/dataQuality verdictsAllowed).
const VERDICT_SECTIONS = [
  "RISHI COMMENTARY",
  "Pillar Breakdown",
];

// P0-1 honest-record markers (rule-23 re-pin, founder audit 2026-10-11):
// the in-page seed record (components/stock/NoVerdictRecord) and the
// whole-page missing record (components/stock/InsufficientDataRecord).
const NO_VERDICT_SEED_MARKER = "NO VERDICT — ILLUSTRATIVE SEED DATA";
const NO_VERDICT_MISSING_MARKER = "INSUFFICIENT DATA — NO VERDICT IS PRODUCED";

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

// ── 2/3. First-byte anchors + the P0-1 verdict trichotomy on both pages ──
const requiredSections = [...extraSections];
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

    // ── P0-1 verdict trichotomy (rule-23 re-pin, founder audit
    // 2026-10-11 "seed rows show no verdict") — exactly one of:
    // seed record | whole-page missing record | full verdict record.
    const seedMarker = countOccurrences(html, NO_VERDICT_SEED_MARKER);
    const missingMarker = countOccurrences(html, NO_VERDICT_MISSING_MARKER);
    if (missingMarker >= 1) {
      // (b) missing class: the whole-page record REPLACES the page — no
      // metrics, no peers, no verdict sections, and no seed in-page record.
      report(seedMarker === 0, `verdict-state ${page} missing-record`, `seed marker ${seedMarker} occurrence(s) (must be 0 beside the whole-page record)`);
      for (const section of VERDICT_SECTIONS) {
        const n = countOccurrences(html, section);
        report(n === 0, `verdict-state ${page} "${section}" suppressed`, `${n} occurrence(s) (must be 0 on the missing record)`);
      }
    } else if (seedMarker >= 1) {
      // (a) seed class: the in-page record keeps the honest surfaces
      // (metrics, peers) and suppresses every verdict section.
      for (const section of ALWAYS_SECTIONS) {
        const n = countOccurrences(html, section);
        report(n >= 1, `section ${page} "${section}"`, `${n} occurrence(s)`);
      }
      for (const section of VERDICT_SECTIONS) {
        const n = countOccurrences(html, section);
        report(n === 0, `verdict-state ${page} "${section}" suppressed`, `${n} occurrence(s) (must be 0 on seed data — P0-1)`);
      }
    } else {
      // (c) live/delayed: the full verdict record — the original A1
      // probes, unmodified. These return the moment licensed live
      // fundamentals cover a probe symbol (P0-8 decision pending).
      for (const section of [...ALWAYS_SECTIONS, ...VERDICT_SECTIONS]) {
        const n = countOccurrences(html, section);
        report(n >= 1, `section ${page} "${section}"`, `${n} occurrence(s)`);
      }
    }

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
