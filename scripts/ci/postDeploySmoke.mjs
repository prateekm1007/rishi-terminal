#!/usr/bin/env node
// scripts/ci/postDeploySmoke.mjs — Constitution v2 C6 ("done = merged +
// deployed + LIVE") and C10 (positive controls), answering founder Round-15
// B1: a post-deploy smoke that FAILS when the production HTML lacks the
// first-byte content sections.
import { readFileSync } from "node:fs";
//
// Why this exists (B-20/B-21 lineage): "merged" was reported done twice
// while production still served the pre-fix build. A smoke that only runs
// against a LOCAL build (the Playwright job) cannot catch that class —
// this script runs against the DEPLOYED site.
//
// The adopted NSE closed-day facts (round 55) load FIRST — the self-test
// below runs during module evaluation and needs them. The file carries its
// own provenance block (source, as-of, scope); the site's
// lib/marketHours.ts reads the same file (rule 14: one source of truth).
const NSE_HOLIDAYS = new Set(
  JSON.parse(readFileSync(new URL("../../data/nse-holidays.json", import.meta.url), "utf8")).holidays,
);
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
//   seedleak  — /stock/RELIANCE (founder directive 2026-10-11, C5/C6): a
//               seed-leak probe that FAILS on the retired leak-era content —
//               the literal "HIGH Data" (the old QVPS coverage-grade badge,
//               renamed to `coverage` in P0-1, rule 2), the retired action
//               word "REDUCE" (P0-6 vocabulary), or a QVPS score rendered
//               for a seed record (P0-1: seed rows show no verdict).
//               Detectors run on the comment-stripped HTML (React inserts
//               <!-- --> separators between JSX text nodes) and anchor on
//               RENDERED tile markup — never bare numbers — because the RSC
//               payload can carry precomputed results for suppressed client
//               components (the flight-payload trap disclosed in the
//               round-46 P0-1 production legs).
//   bare-cache— RESP-1R (founder, 2026-10-12, C6): every content probe runs
//               TWICE, on both cache keys. The probe leg (?smoke=<ts>) always
//               misses the edge ISR cache and verifies what the ORIGIN
//               serves; the bare-cache leg (plain user-facing URL — no query
//               param, no custom headers) verifies what a USER's first
//               request can get from the edge (x-vercel-cache HIT/STALE,
//               stale-while-revalidate). The old probe passed while the
//               public /stock/RELIANCE page served stale leak-era content
//               because the two shared no cache key; the C6 "live" leg now
//               covers both. Bare-cache labels carry the "bare-cache " prefix.
//   Round 53 (founder item 3, 2026-10-12): the BARE leg is the AUTHORITATIVE
//               check and runs FIRST — "the bare URL is the one users see".
//               Its evidence line records the response's age and
//               x-vercel-cache headers. Render-freshness now fails on ANY
//               observation line older than 15 minutes while the market is
//               open by IST time, whatever the label wording — a stale
//               honestly-labelled line still means the quote pipeline is not
//               delivering during the session (the 13:28-all-afternoon
//               class; the warmer/ingest outage the probe now exposes).
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

// Seed-leak probe (founder directive 2026-10-11): RELIANCE is the seed
// canary. The three leak families are the retired leak-era renderings —
//   1. "HIGH Data" — the old QVPS badge subtitle `v2.0 · {dataQuality} Data`
//      (components/score/RishiScoreDual.tsx before P0-1 renamed the field
//      to `coverage`; the founder's 2026-10-11 audit caught it live:
//      "SBIN/RELIANCE show 'v2.0 · HIGH Data' beside 'illustrative seed
//      inputs'"). The full badge regex pins the exact retired markup;
//      the literal string is the founder's named marker.
//   2. "REDUCE" — the old ActionType vocabulary (`score >= 40 -> REDUCE`,
//      rendered by `{action.replace(/_/g, " ")}`); removed from every UI
//      surface by P0-6. Word-boundary matched so it cannot hide inside
//      other tokens.
//   3. A QVPS score on a seed record — the retired badge regex on ANY
//      record class (it cannot honestly render anywhere any more), plus
//      the QVPS tile label whenever the record is seed/missing (a seed
//      record must render no verdict surface at all — P0-1; on a
//      live/delayed record the tile is legitimate, so the label alone is
//      not a leak there).
const SEEDLEAK_SYMBOL = "/stock/RELIANCE";
const SEEDLEAK_HIGH_DATA = "HIGH Data";
const SEEDLEAK_REDUCE = /\bREDUCE\b/g;
const SEEDLEAK_OLD_BADGE = /v2\.0\s*·\s*(?:HIGH|MEDIUM|LOW)\s*Data/g;
const SEEDLEAK_QVPS_LABEL = "QVPS Score";

const STALE_AFTER_MS = 15 * 60 * 1000;
const IST_MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
// IST session mirror (lib/marketHours: Mon–Fri 09:15–15:30 IST). Duplicated
// bounds (not imported — this script is plain node .mjs); the vitest suite
// for the freshness rule is the contract owner, this mirror only decides
// which honesty leg applies at probe time.
const NSE_OPEN_MIN = 9 * 60 + 15, NSE_CLOSE_MIN = 15 * 60 + 30;

const argv = process.argv.slice(2);

// ── 0. Self-test (founder order 12 Oct 2026, C5/C6 liveness teeth) ───────
// Runs BEFORE any network: fixture HTML discriminates the release-marker
// and freshness checks — the pre-release render MUST fail, the current
// render MUST pass. Invoked by test/probeLiveness.selfTest.test.ts (the
// merge-guard --self-test precedent: no network, fixtures only).
if (argv.includes("--self-test")) {
  runLivenessSelfTest();
}

function runLivenessSelfTest() {
  // Exact strings from real captures (session evidence, round 51): the OLD
  // fixture replicates the 02eac31-era render (pre-licence-label,
  // pre-CHAT-ONLY, same-session stale quote called intraday); the NEW
  // fixture replicates the current honest render.
  const OLD_STOCK =
    `<h1>SBIN</h1><div>Rishi Terminal</div>` +
    `<div>NO VERDICT - ILLUSTRATIVE SEED DATA</div>` +
    `<div>Key Metrics</div><div>Peer Comparison</div>` +
    `<title>State Bank of India (SBIN) — verdicts paused (exchange-data license pending) | Rishi Terminal</title>` +
    `<div>No verdict — the Ashish Kacholia Whale Small-Cap Hunter framework is price-based: its verdict reads price-derived inputs</div>` +
    `<div>Mon 12 Oct, 09:45 IST · market open · intraday quote</div>`;
  const OLD_RISHIS =
    `<div role="region" aria-label="Rishi list"><span>MASTER</span></div><div>Rishi Terminal</div>`;
  const NEW_STOCK =
    `<h1>SBIN</h1><div>Rishi Terminal</div>` +
    `<div>NO VERDICT - ILLUSTRATIVE SEED DATA</div>` +
    `<div>Key Metrics</div><div>Peer Comparison</div>` +
    `<div>Licence pending — no verdict: the Ashish Kacholia Whale Small-Cap Hunter framework is price-based: its verdict reads price-derived inputs</div>` +
    `<div>Mon 12 Oct, 15:15 IST · market closed · last session quote</div>`;
  const NEW_RISHIS =
    `<div role="region" aria-label="Rishi list"><span>MASTER</span><span>CHAT-ONLY</span></div><div>Rishi Terminal</div>`;
  // Fixed display moments (deterministic, never wall-clock): Monday open
  // session 15:20 IST, Monday evening 18:58 IST (closed).
  const OPEN_NOW = Date.parse("2026-10-12T09:50:00.000Z");
  const CLOSED_NOW = Date.parse("2026-10-12T13:28:00.000Z");
  const results = [];
  const expect = (label, actual, want) => {
    const ok = actual === want;
    console.log(`self-test ${ok ? "PASS" : "FAIL"}  ${label} (got ${actual}, want ${want})`);
    results.push(ok);
  };
  // The old render fails every new check (the positive control: a stale
  // release can never go green).
  expect("old stock lacks the licence marker", hasLicenceLabel(OLD_STOCK), false);
  expect("old rishis lacks CHAT-ONLY", hasChatOnlyTag(OLD_RISHIS), false);
  expect("old stock mislabels a stale quote as intraday",
    checkRenderFreshness(OLD_STOCK, OPEN_NOW).ok, false);
  // The current render passes (closed-session leg + fresh-open leg).
  expect("new stock carries the licence marker", hasLicenceLabel(NEW_STOCK), true);
  expect("new rishis carries CHAT-ONLY", hasChatOnlyTag(NEW_RISHIS), true);
  expect("new stock closed-session label passes",
    checkRenderFreshness(NEW_STOCK, CLOSED_NOW).ok, true);
  expect("fresh intraday passes",
    checkRenderFreshness(
      NEW_STOCK.replace("15:15 IST · market closed · last session quote",
        "15:15 IST · market open · intraday quote"),
      Date.parse("2026-10-12T09:50:00.000Z"),
    ).ok, true);
  // Round 53 (founder item 3): the absolute open-session rule and the
  // server-render forms.
  expect("open session: a stale HONESTLY-LABELLED line fails (the 13:28-all-afternoon class)",
    checkRenderFreshness(
      NEW_STOCK.replace("Mon 12 Oct, 15:15 IST · market closed · last session quote",
        "as of Mon 12 Oct, 09:45 IST · stale"),
      OPEN_NOW,
    ).ok, false);
  expect("open session: a >15-min-old server-render line fails, whatever the wording",
    checkRenderFreshness(
      NEW_STOCK.replace("Mon 12 Oct, 15:15 IST · market closed · last session quote",
        "as of Mon 12 Oct, 09:45 IST (server render)"),
      OPEN_NOW,
    ).ok, false);
  expect("open session: a fresh server-render line passes",
    checkRenderFreshness(
      NEW_STOCK.replace("Mon 12 Oct, 15:15 IST · market closed · last session quote",
        "as of Mon 12 Oct, 15:15 IST (server render)"),
      OPEN_NOW,
    ).ok, true);
  expect("closed session: the server-render disclosure passes (no market claim in the first byte)",
    checkRenderFreshness(
      NEW_STOCK.replace("Mon 12 Oct, 15:15 IST · market closed · last session quote",
        "as of Mon 12 Oct, 15:15 IST (server render)"),
      CLOSED_NOW,
    ).ok, true);
  expect("closed session: a stale server-render line passes (age is honest when the market is closed)",
    checkRenderFreshness(
      NEW_STOCK.replace("Mon 12 Oct, 15:15 IST · market closed · last session quote",
        "as of Mon 12 Oct, 09:45 IST · stale (server render)"),
      CLOSED_NOW,
    ).ok, true);
  // Round 55 (the adopted NSE closed-day calendar, data/nse-holidays.json):
  // the probe's open-session clock must agree with the site's — on a sourced
  // NSE holiday the freshness rule's open branch does NOT fire, so a stale
  // line stays honest. Pre-adoption this leg FAILED: istOpenAt was
  // weekend-only and read Dussehra (Tue 2026-10-20) as an open session.
  const HOLIDAY_NOW = Date.parse("2026-10-20T04:30:00.000Z"); // 10:00 IST, Dussehra
  expect("sourced NSE holiday (Dussehra): a stale line passes (probe and site agree the market is closed)",
    checkRenderFreshness(
      NEW_STOCK.replace("Mon 12 Oct, 15:15 IST · market closed · last session quote",
        "as of Mon 12 Oct, 09:45 IST · stale (server render)"),
      HOLIDAY_NOW,
    ).ok, true);
  expect("sourced NSE holiday: an intraday claim still fails (closed is closed, whatever the calendar says)",
    checkRenderFreshness(
      NEW_STOCK.replace("Mon 12 Oct, 15:15 IST · market closed · last session quote",
        "as of Mon 12 Oct, 09:45 IST · market open · intraday quote"),
      HOLIDAY_NOW,
    ).ok, false);
  const green = results.every(Boolean);
  console.log(green ? "self-test GREEN: liveness checks discriminate old vs current" : "self-test RED");
  process.exit(green ? 0 : 1);
}
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

/** Count global-regex matches (the `grep -o | wc -l` semantics for
 * patterns; the caller passes a fresh `g`-flagged regex). */
function countPattern(haystack, re) {
  const m = haystack.match(re);
  return m ? m.length : 0;
}

/** React SSR inserts <!-- --> separators between adjacent JSX text
 * nodes, which would split the leak-era strings ("v2.0 · <!-- -->HIGH
 * <!-- --> Data"). Strip them before matching — rendered text is what
 * the user sees. */
function stripSsrComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, "");
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

// ── 2/3. First-byte anchors + the P0-1 verdict trichotomy, on BOTH cache keys
// (probe key + bare user-facing key — see "bare-cache" in the header) ──────
const requiredSections = [...extraSections];

/** Plain fetch: no cache-busting query param, no custom headers — the
 *  closest reproduction of a user's request, sharing the user's CDN cache
 *  key (the edge ISR entry, x-vercel-cache HIT/STALE).
 *
 *  Round 53 (founder item 3, words verbatim: "Record age and
 *  x-vercel-cache in the output"): the bare leg now CAPTURES those two
 *  response headers so every authoritative evidence line carries the
 *  edge's own disclosure of what it served. */
async function fetchBare(url) {
  const res = await fetch(url, { redirect: "follow" });
  const text = await res.text();
  return {
    status: res.status,
    text,
    edgeAge: res.headers.get("age"),
    edgeCache: res.headers.get("x-vercel-cache"),
  };
}

/** Round 53 (founder item 3): print the edge's cache headers for a bare
 *  leg — the diagnostic the founder asked to see in every output. */
function reportEdgeHeaders(label, r) {
  if (r.edgeAge === undefined && r.edgeCache === undefined) return;
  console.log(`edge-headers  ${label} — age: ${r.edgeAge ?? "—"} · x-vercel-cache: ${r.edgeCache ?? "—"}`);
}

/** Content checks for one stock page, shared by the probe and bare-cache
 * legs. `prefix` distinguishes the evidence lines ("" for the probe key,
 * "bare-cache " for the user-facing key); labels are otherwise identical. */
function checkStockPage(prefix, page, html) {
  // Page integrity control (B-18): a zero-count absence check is only
  // meaningful on a page that actually rendered.
  const hasH1 = /<h1[^>]*>/.test(html);
  const hasTitle = /Rishi Terminal/.test(html);
  report(hasH1 && hasTitle, `${prefix}page-integrity ${page}`, `<h1 present: ${hasH1}; title marker: ${hasTitle}; ${html.length} bytes`);

  // ── P0-1 verdict trichotomy (rule-23 re-pin, founder audit
  // 2026-10-11 "seed rows show no verdict") — exactly one of:
  // seed record | whole-page missing record | full verdict record.
  const seedMarker = countOccurrences(html, NO_VERDICT_SEED_MARKER);
  const missingMarker = countOccurrences(html, NO_VERDICT_MISSING_MARKER);
  if (missingMarker >= 1) {
    // (b) missing class: the whole-page record REPLACES the page — no
    // metrics, no peers, no verdict sections, and no seed in-page record.
    report(seedMarker === 0, `${prefix}verdict-state ${page} missing-record`, `seed marker ${seedMarker} occurrence(s) (must be 0 beside the whole-page record)`);
    for (const section of VERDICT_SECTIONS) {
      const n = countOccurrences(html, section);
      report(n === 0, `${prefix}verdict-state ${page} "${section}" suppressed`, `${n} occurrence(s) (must be 0 on the missing record)`);
    }
  } else if (seedMarker >= 1) {
    // (a) seed class: the in-page record keeps the honest surfaces
    // (metrics, peers) and suppresses every verdict section.
    for (const section of ALWAYS_SECTIONS) {
      const n = countOccurrences(html, section);
      report(n >= 1, `${prefix}section ${page} "${section}"`, `${n} occurrence(s)`);
    }
    for (const section of VERDICT_SECTIONS) {
      const n = countOccurrences(html, section);
      report(n === 0, `${prefix}verdict-state ${page} "${section}" suppressed`, `${n} occurrence(s) (must be 0 on seed data — P0-1)`);
    }
  } else {
    // (c) live/delayed: the full verdict record — the original A1
    // probes, unmodified. These return the moment licensed live
    // fundamentals cover a probe symbol (P0-8 decision pending).
    for (const section of [...ALWAYS_SECTIONS, ...VERDICT_SECTIONS]) {
      const n = countOccurrences(html, section);
      report(n >= 1, `${prefix}section ${page} "${section}"`, `${n} occurrence(s)`);
    }
  }

  for (const section of requiredSections) {
    const n = countOccurrences(html, section);
    report(n >= 1, `${prefix}section ${page} "${section}"`, `${n} occurrence(s)`);
  }

  const priceUnavail = countOccurrences(html, "PRICE UNAVAILABLE");
  report(priceUnavail === 0, `${prefix}price ${page} "PRICE UNAVAILABLE"`, `${priceUnavail} occurrence(s) (must be 0)`);

  // ── Release markers + render freshness (founder order 12 Oct 2026) ──
  // DELIV-2 marker where it applies: the SBIN seed page carries
  // price-based refusals, each labelled 'Licence pending' first.
  if (page === "/stock/SBIN") {
    const lic = countOccurrences(stripSsrComments(html), "Licence pending");
    report(lic >= 1, `${prefix}release-marker ${page} "Licence pending"`, `${lic} occurrence(s) (must be >= 1 — DELIV-2)`);
  }
  // STALE-QUOTE liveness: the observation line must be recency-honest at
  // probe time — an intraday label on a >15-minute-old quote fails, on any
  // code vintage (C6 teeth against stale edge objects).
  const fresh = checkRenderFreshness(stripSsrComments(html), Date.now());
  report(fresh.ok, `${prefix}render-freshness ${page}`, fresh.detail);
}

// Two legs per page. Round 53 (founder item 3): the BARE URL is the
// AUTHORITATIVE check — it runs FIRST, and its evidence carries the edge's
// age/x-vercel-cache headers — because the bare URL is the render users
// get (the founder's words: "The bare URL is the one users see"). The
// probe-key leg (?smoke=<ts>) stays as the ORIGIN control: it always
// misses the edge ISR cache and proves what a fresh regeneration serves,
// isolating edge-staleness from origin-staleness when the two disagree.
for (const page of PAGES) {
  const legs = [
    { prefix: "bare-cache ", label: `bare-cache ${page}`, url: `${base}${page}`, fetcher: fetchBare, bare: true },
    { prefix: "", label: `sections ${page}`, url: `${base}${page}?smoke=${Date.now()}`, fetcher: fetchText },
  ];
  for (const leg of legs) {
    try {
      const r = await leg.fetcher(leg.url);
      if (leg.bare) reportEdgeHeaders(leg.label, r);
      if (r.status !== 200) {
        report(false, leg.label, `HTTP ${r.status}`);
        continue;
      }
      checkStockPage(leg.prefix, page, r.text);
    } catch (err) {
      report(false, leg.label, `transport error: ${err.message}`);
    }
  }
}

// ── 4. RELIANCE seed-leak probe (founder directive 2026-10-11, C5/C6) ─────
// Runs on BOTH cache keys (probe key + bare user-facing URL — see the
// "bare-cache" note in the header). A stale edge copy of RELIANCE now
// fails the smoke exactly like a stale origin render would.

/** Seed-leak detectors for one page render, shared by the probe and
 * bare-cache legs. `prefix` distinguishes the evidence lines. */
function checkSeedleak(prefix, rawText) {
  // Page integrity control first (B-18): absence/presence checks mean
  // nothing on a page that did not actually render.
  const hasH1 = /<h1[^>]*>/.test(rawText);
  const hasTitle = /Rishi Terminal/.test(rawText);
  report(hasH1 && hasTitle, `${prefix}seedleak RELIANCE page-integrity`, `<h1 present: ${hasH1}; title marker: ${hasTitle}; ${rawText.length} bytes`);

  const html = stripSsrComments(rawText);

  // Record-state control: at least one honest record class must render
  // (seed marker | whole-page missing marker | full verdict record), so
  // the zero counts below cannot come from a missing page (B-18) and the
  // QVPS-label detector can be scoped to the record class honestly.
  const seedMarker = countOccurrences(html, NO_VERDICT_SEED_MARKER);
  const missingMarker = countOccurrences(html, NO_VERDICT_MISSING_MARKER);
  const verdictSections = VERDICT_SECTIONS.filter((s) => countOccurrences(html, s) >= 1).length;
  const recordClass =
    missingMarker >= 1 ? "missing" : seedMarker >= 1 ? "seed" : verdictSections === VERDICT_SECTIONS.length ? "verdict" : "none";
  report(
    recordClass !== "none",
    `${prefix}seedleak RELIANCE record-control`,
    `record class: ${recordClass} (seed=${seedMarker} missing=${missingMarker} verdict-sections=${verdictSections}/${VERDICT_SECTIONS.length})`,
  );

  // Detector 1 — the founder's named literal, any record class.
  const highData = countOccurrences(html, SEEDLEAK_HIGH_DATA);
  report(highData === 0, `${prefix}seedleak RELIANCE "HIGH Data"`, `${highData} occurrence(s) (must be 0 — the QVPS coverage grade was renamed to coverage, P0-1 rule 2)`);

  // Detector 2 — the retired action word, any record class (P0-6).
  const reduce = countPattern(html, new RegExp(SEEDLEAK_REDUCE.source, "g"));
  report(reduce === 0, `${prefix}seedleak RELIANCE "REDUCE"`, `${reduce} occurrence(s) (must be 0 — the action vocabulary is retired, P0-6)`);

  // Detector 3 — a QVPS score for a seed record: the retired badge
  // markup can never honestly render (any record class); the QVPS tile
  // label must not render when the record is seed/missing (P0-1).
  const oldBadge = countPattern(html, new RegExp(SEEDLEAK_OLD_BADGE.source, "g"));
  report(oldBadge === 0, `${prefix}seedleak RELIANCE old QVPS badge "v2.0 · <grade> Data"`, `${oldBadge} occurrence(s) (must be 0 — retired markup, renders a score for a seed record)`);
  const qvpsLabel = countOccurrences(html, SEEDLEAK_QVPS_LABEL);
  const qvpsOnSeed = recordClass === "seed" || recordClass === "missing" ? qvpsLabel : 0;
  report(
    qvpsOnSeed === 0,
    `${prefix}seedleak RELIANCE QVPS score on ${recordClass} record`,
    `${qvpsOnSeed} occurrence(s) of the tile label (must be 0 on seed/missing — P0-1; ${qvpsLabel} on the page overall)`,
  );

  // STALE-QUOTE liveness on the canary page too (same rule as §6).
  const fresh = checkRenderFreshness(html, Date.now());
  report(fresh.ok, `${prefix}render-freshness RELIANCE`, fresh.detail);
}

for (const leg of [
  { prefix: "bare-cache ", label: "bare-cache seedleak RELIANCE", url: `${base}${SEEDLEAK_SYMBOL}`, fetcher: fetchBare, bare: true },
  { prefix: "", label: "seedleak RELIANCE", url: `${base}${SEEDLEAK_SYMBOL}?smoke=${Date.now()}`, fetcher: fetchText },
]) {
  try {
    const r = await leg.fetcher(leg.url);
    if (leg.bare) reportEdgeHeaders(leg.label, r);
    if (r.status !== 200) {
      report(false, leg.label, `HTTP ${r.status}`);
      continue;
    }
    checkSeedleak(leg.prefix, r.text);
  } catch (err) {
    report(false, leg.label, `transport error: ${err.message}`);
  }
}

// ── Release markers + render freshness: pure check functions (founder order 12 Oct 2026) ───
// C6 liveness teeth: every shipped release leaves a marker the probe
// asserts, so an old build fails on absence (C5 positive control runs in
// --self-test above):
//   - RISHI-21 → the CHAT-ONLY chip on /rishis.
//   - DELIV-2 → the 'Licence pending' label where price-based refusals
//     render (/stock/SBIN seed page).
//   - STALE-QUOTE → the observation line is recency-honest: a quote older
//     than 15 minutes is never 'market open · intraday quote'.

/** CHAT-ONLY presence (RISHI-21 release marker). */
function hasChatOnlyTag(html) {
  return html.includes("CHAT-ONLY");
}

/** Licence-label presence (DELIV-2 release marker). */
function hasLicenceLabel(html) {
  return html.includes("Licence pending");
}

function istOpenAt(nowMs) {
  const ist = new Date(nowMs + 330 * 60_000);
  const wd = ist.getUTCDay();
  if (wd < 1 || wd > 5) return false;
  // Round 55: the probe's open-session clock reads the SAME sourced NSE
  // closed-day calendar the site reads (data/nse-holidays.json — one source
  // of truth, rule 14). Without this, a holiday deploy would classify as
  // "open" here while the site honestly computes closed, and the 15-minute
  // freshness rule would fail on honestly-stale lines. Outside the file's
  // year scope the weekend rule alone applies (documented degradation).
  const isoDate = `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}-${String(ist.getUTCDate()).padStart(2, "0")}`;
  if (NSE_HOLIDAYS.has(isoDate)) return false;
  const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return mins >= NSE_OPEN_MIN && mins < NSE_CLOSE_MIN;
}

/** Parse Y3 observation stamps in rendered HTML → [{ms, qualifier}]. The
 *  stamp carries no year ("Mon 12 Oct, 15:15 IST"); resolve against the
 *  probe year with a day-boundary slide. Returns [] when the page exposes
 *  no observation line (unavailable pages have no age to check). */
function parseObsLines(html, nowMs) {
  const out = [];
  const re = /(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec), (\d{2}):(\d{2}) IST/g;
  let m;
  const probeYear = new Date(nowMs).getUTCFullYear();
  while ((m = re.exec(html)) !== null) {
    let ms = Date.UTC(probeYear, IST_MONTHS[m[3]], Number(m[2]), Number(m[4]), Number(m[5])) - 330 * 60_000;
    if (ms > nowMs + 24 * 3600_000) ms = Date.UTC(probeYear - 1, IST_MONTHS[m[3]], Number(m[2]), Number(m[4]), Number(m[5])) - 330 * 60_000;
    const tail = html.slice(m.index, m.index + 160);
    out.push({ ms, tail });
  }
  return out;
}

/** Render-freshness verdict for one page render at a display moment.
 *  Round 53 (founder item 3, words verbatim: "Make the bare URL the
 *  authoritative check. Fail if the observation line is older than 15
 *  minutes while the market is open by IST time."):
 *  - session open → EVERY observation line must be at most 15 minutes old,
 *    whatever its wording. A stale-but-honestly-labelled line still means
 *    the quote pipeline is not delivering during the session — the
 *    13:28-all-afternoon class — and the founder's rule is absolute. (The
 *    label WORDING honesty is pinned separately by the label unit tests.)
 *  - session closed → no intraday claim anywhere; the honest forms are
 *    closed-labelled lines, stale-disclosed lines, and the round-53
 *    server-render disclosure "(server render)" (the first byte carries
 *    no market claim by design — the client computes it after hydration).
 *  - no observation line → pass-skipped (unavailable pages expose no
 *    age to check). */
function checkRenderFreshness(html, nowMs) {
  const lines = parseObsLines(html, nowMs);
  if (lines.length === 0) return { ok: true, skipped: true, detail: "no observation line (unavailable page) — nothing to age" };
  const open = istOpenAt(nowMs);
  if (open) {
    for (const l of lines) {
      const ageMin = Math.round((nowMs - l.ms) / 60000);
      if (nowMs - l.ms > STALE_AFTER_MS) {
        return {
          ok: false,
          detail: `open session: a ${ageMin}-minute-old observation line (must be ≤15) — "${l.tail.slice(0, 72)}"`,
        };
      }
    }
    return { ok: true, detail: "open session: every observation line is ≤15 minutes old" };
  }
  const hasIntraday = lines.some((l) => l.tail.includes("market open · intraday quote"));
  if (hasIntraday) {
    return { ok: false, detail: "closed session: an intraday claim still renders" };
  }
  const honest = lines.some((l) =>
    l.tail.includes("market closed") || l.tail.includes("stale") || l.tail.includes("server render"));
  return {
    ok: honest,
    detail: honest
      ? "closed session: honest label forms (closed / stale / server-render disclosed)"
      : "closed session: no honest label form found",
  };
}

// ── 5. Y4 null-not-zero on the bank page ──────────────────────────────────
/** RISHI-21 release marker on /rishis (both cache keys): the roster region
 *  must render (positive control) and carry the CHAT-ONLY chip. */
// ── 5. RISHI-21 marker on /rishis ─────────────────────────────────────────
function checkRishis(prefix, html) {
  const region = html.includes("Rishi list");
  report(region, `${prefix}rishis roster region`, `region present: ${region} (positive control)`);
  if (!region) return;
  const chip = countOccurrences(stripSsrComments(html), "CHAT-ONLY");
  report(chip >= 1, `${prefix}release-marker /rishis "CHAT-ONLY"`, `${chip} occurrence(s) (must be >= 1 — RISHI-21)`);
}

for (const leg of [
  { prefix: "", label: "rishis", url: `${base}/rishis?smoke=${Date.now()}`, fetcher: fetchText },
  { prefix: "bare-cache ", label: "bare-cache rishis", url: `${base}/rishis`, fetcher: fetchBare },
]) {
  try {
    const r = await leg.fetcher(leg.url);
    if (r.status !== 200) {
      report(false, leg.label, `HTTP ${r.status}`);
      continue;
    }
    checkRishis(leg.prefix, r.text);
  } catch (err) {
    report(false, leg.label, `transport error: ${err.message}`);
  }
}

// ── 6. Y4 null-not-zero on the bank page ──────────────────────────────────
try {
  const rz = await fetchText(`${base}${NULLZERO_SYMBOL}?smoke=${Date.now()}`);
  if (rz.status !== 200) {
    report(false, "nullzero BANDHANBNK", `HTTP ${rz.status}`);
  } else {
    for (const defect of NULLZERO_DEFECTS) {
      const n = countOccurrences(rz.text, defect);
      report(n === 0, `nullzero "${defect}"`, `${n} occurrence(s) (must be 0)`);
    }
    const panel = countOccurrences(rz.text, NULLZERO_PANEL_CONTROL);
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
