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
  "Pillar Breakdown", // RishiScoreDual
  "RISHI COMMENTARY", // RishiScoreDual (commentary block)
  "P/B Ratio", // MetricsPanel StatGroup (renders on every stock page)
  "Peer Comparison", // PeerComparison heading
  "Key Metrics", // MetricsPanel heading
  "Chat</button>", // WisdomSidebar mode button (stable rail marker; React renders
  // the emoji and label as separate text nodes, so the closing-tag form
  // is the only stable substring)
];

test("stock page serves the content sections in the raw SSR HTML", async ({ request }) => {
  const res = await request.get("/stock/SBIN");
  expect(res.status()).toBe(200);
  const html = await res.text();
  for (const section of OVERVIEW_SECTIONS) {
    expect(html, `raw HTML must contain "${section}"`).toContain(section);
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
