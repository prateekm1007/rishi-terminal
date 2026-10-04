import { test, expect } from "@playwright/test";

// A5 (Round 14): /methodology was unreachable from the product (FD-15) —
// not in the nav, not on any stock page. These assertions pin the links in
// the RAW SSR HTML (request fixture — no JS).
//
// Fail-first evidence: the pre-A5 tree contained ZERO `href="/methodology"`
// occurrences anywhere in the built HTML (grep over components/Sidebar.tsx,
// app/, and the baked stock page returned nothing) — verified before the
// change, so the assertions below were un-satisfiable before the fix.

test("the shell nav links /methodology on every page", async ({ request }) => {
  const res = await request.get("/");
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(html).toContain('href="/methodology"');
});

test("every stock page links /methodology from its footer (and the nav)", async ({ request }) => {
  const res = await request.get("/stock/SBIN");
  expect(res.status()).toBe(200);
  const html = await res.text();
  // positive control for the count below: the footer bar renders its label
  expect(html).toContain("Methodology");
  // nav link + stock-page footer link both present
  expect(html.match(/href="\/methodology"/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
});
