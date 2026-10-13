import { test, expect } from "@playwright/test";

// A1 (Round 14): the content components (RishiScoreDual, MetricsPanel,
// PeerComparison, WisdomSidebar) were shipped as next/dynamic with
// ssr:false — the raw SSR HTML of every stock page ended after
// "Top Rishi Scores": no pillar breakdown, no commentary, no key
// metrics, no peer table, no wisdom rail. That is an SEO and no-JS
// regression (auditor: 0 occurrences of the section headings in the
// raw HTML of /stock/SBIN), and it made every grep-based acceptance
// vacuous: `grep -c "Promoter Hold0.0%"` returned 0 because the whole
// panel was missing, not because the value was fixed.
//
// This spec pins the contract: the key sections exist in the FIRST-BYTE
// HTML (the `request` fixture never runs JS), on a complete record
// (SBIN) and on a bank record with known-null fields (BANDHANBNK) that
// carries both the Y4 negative control (placeholder zeros must not
// render) and the positive control (the section itself must be
// present, so a zero can never come from missing content).

// Markers verified to be ABSENT from the pre-fix HTML (0 occurrences):
// they exist only inside the components' JSX, so they can only appear
// when the component actually server-renders. (The strings "Key Metrics"
// and "Peer Comparison" also ride the RSC flight payload as translation
// strings, so they are asserted too but are NOT the load-bearing
// controls.) "HISTORICAL WISDOM" is deliberately NOT used as the
// WisdomSidebar marker: that heading is date-seeded content (a parallel
// exists only on some days, per rule 18's IST-day seeding — rendering it
// unconditionally would fabricate history). The sidebar's stable marker
// is its wisdom/chat mode button.
const OVERVIEW_SECTIONS = [
  // P0-1 (round-46 founder audit: "Seed rows show no verdict"): the QVPS
  // tile markers ("Pillar Breakdown", "RISHI COMMENTARY") are verdict
  // content — suppressed on seed data; they moved to the ABSENCE pins
  // below. The honest no-verdict record is the tile area's first-byte
  // positive control instead.
  "NO VERDICT — ILLUSTRATIVE SEED DATA", // NoVerdictRecord (the P0-1 gate, in the first byte)
  "P/B Ratio", // MetricsPanel StatGroup (renders on every stock page)
  "Peer Comparison", // PeerComparison heading
  "Key Metrics", // MetricsPanel heading
  "Chat</button>", // WisdomSidebar mode button (stable rail marker; React renders
  // the emoji and label as separate text nodes, so the closing-tag form
  // is the only stable substring)
];

const VERDICT_SECTIONS = [
  "Pillar Breakdown", // RishiScoreDual (QVPS tile — verdict content)
  "RISHI COMMENTARY", // RishiScoreDual commentary block (verdict content)
];

test("stock page serves the content sections in the raw SSR HTML — and NO verdict section on seed data (P0-1)", async ({ request }) => {
  const res = await request.get("/stock/SBIN");
  expect(res.status()).toBe(200);
  const html = await res.text();
  for (const section of OVERVIEW_SECTIONS) {
    expect(html, `raw HTML must contain "${section}"`).toContain(section);
  }
  // P0-1 (founder audit 2026-10-11): the verdict tiles are NOT in the
  // first byte of a seed record's page — the honest state is server-
  // rendered, exactly the standard the A1 fix set for every other section.
  for (const section of VERDICT_SECTIONS) {
    expect(html, `seed page must NOT contain "${section}"`).not.toContain(section);
  }
});

test("Y4 null-not-zero holds in the SSR HTML of a bank page (positive + negative control)", async ({ request }) => {
  const res = await request.get("/stock/BANDHANBNK");
  expect(res.status()).toBe(200);
  const html = await res.text();
  // Positive control: the rendered BANK BRANCH of MetricsPanel must be
  // present — "hidden for banks" is a JSX literal that only exists in the
  // DOM when MetricsPanel server-renders the isBank branch (Y4/FD-16:
  // D/E, OPM and FCF yield are hidden for banks with an honest note; the
  // "Promoter Hold" label cannot be used here — the consensus-lever
  // payload string "Low Promoter Holding" contains it as a substring).
  // Without this control the two zeros below are vacuous (missing panel,
  // not fixed values).
  expect(html).toContain("hidden for banks");
  // Negative controls: placeholder zeros must never render as values.
  expect(html).not.toContain("Promoter Hold0.0%");
  expect(html).not.toContain("D/E Ratio0.0x");
});

// HYD-PINS (founder direction, 2026-10-10): the /pulse first byte must
// not strand at a loading promise. The macro tab is the DEFAULT tab and
// the currency section's transient "Fetching live currency rates…" used
// to be the SSR state — a no-JS client (or a crawler) saw an indefinite
// "Fetching…" that can never resolve. The first-byte contract now: the
// raw HTML carries the HONEST unavailable state (live FX needs the
// browser's fetch), never the stranding loading text. Fail-first: the
// pre-fix raw HTML contained the stranding marker (RED capture in
// docs/evidence/round43/red-hyd-pins.txt).
test("HYD-PINS: /pulse first byte carries the honest FX state, never a stranding fetch promise", async ({ request }) => {
  const res = await request.get("/pulse");
  expect(res.status()).toBe(200);
  const html = await res.text();
  // positive control FIRST (B-18): the currency section itself is in the
  // first byte (the macro tab is the default tab) — the section's stable
  // heading rides the RSC payload.
  expect(html).toContain("CURRENCY IMPACT");
  // the stranding loading promise must be gone from the raw HTML
  expect(html).not.toContain("Fetching live currency rates");
  // the honest no-JS state is present verbatim
  expect(html).toContain("Live currency rates unavailable right now");
});

// Round 54 (founder order 2026-10-13): "Render 'No headlines yet' in the
// server HTML of the news body." The news list is client-fetched, but the
// page is a server-rendered client component — the first byte used to
// carry twelve skeleton cards (an animation that never resolves without
// JS, the exact /pulse stranding class the HYD-PINS rule forbids). The
// first-byte contract now: the honest empty state renders server-side,
// with a subline that discloses the loading mechanism (never claiming a
// feed state the server has not checked); the skeleton appears only
// post-hydration, once a real fetch is in flight.
test("round 54: /news first byte carries 'No headlines yet' — never a stranding skeleton", async ({ request }) => {
  const res = await request.get("/news");
  expect(res.status()).toBe(200);
  const html = await res.text();
  // positive control FIRST (B-18): the news body itself is in the first
  // byte — the page heading rides the server-rendered shell.
  expect(html).toContain("page-breadcrumb");
  // the founder-named honest empty state is present verbatim
  expect(html).toContain("No headlines yet.");
  // the subline discloses the loading mechanism (the pre-fetch state —
  // the server has not checked the feed, so it claims no feed state)
  expect(html).toContain("Headlines load in the browser");
  // the skeleton's animation marker must be ABSENT from the first byte
  // (it exists only inside SkeletonCard's JSX)
  expect(html).not.toContain("skp 1.4s");
  // the region filter is BUILT (founder: "build the filters"): the ALL
  // pill renders in the first byte (the region pills populate with the
  // fetched feed; the ALL pill is the always-present control). React SSR
  // may interleave comment markers between text children, so the pin
  // matches the button's opening, not its closing tag.
  expect(html).toMatch(/<button[^>]*aria-pressed="true"[^>]*>\s*ALL/);
});
