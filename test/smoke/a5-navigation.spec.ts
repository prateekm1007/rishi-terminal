import { test, expect } from "@playwright/test";

// A5 (Round 14): /methodology was unreachable from the product (FD-15) —
// the original assertions pinned NAV reachability.
//
// MH (founder directive 10+11, 2026-10-06): the methodology surface is now
// HIDDEN FROM NAVIGATION while the route, content and CONTEXTUAL links
// stay. The founder's directive supersedes FD-15's nav-reachability
// requirement; this spec was rewritten to pin the NEW contract (a
// founder-directed gate replacement, recorded here — not a silent
// weakening):
//
//   1. the shell sidebar does NOT link /methodology — with a positive
//      control proving the sidebar itself rendered (C10: an absence check
//      against a missing nav proves nothing);
//   2. /methodology remains a coherent public route (200 + content);
//   3. the stock page's contextual "Methodology" footer link REMAINS
//      (score transparency infrastructure — directive 11: hide ≠ delete).

test("the shell nav does NOT link /methodology (positive control: nav rendered)", async ({ request }) => {
  const res = await request.get("/");
  expect(res.status()).toBe(200);
  const html = await res.text();
  // Positive control: the sidebar region exists and rendered its items.
  // Scope correction (2026-10-12): the audited region is the sidebar
  // ELEMENT — from its opening tag to the matching </aside>. The previous
  // 40,000-character window was a proxy for "the sidebar" that predated
  // the homepage Today panel (DEMO-4); the panel's CONTEXTUAL methodology
  // link (the founder's directive 11: "hide ≠ delete" — contextual links
  // STAY, like the stock page's footer link this spec already pins) fell
  // inside the proxy window and tripped the check. Narrowing to the real
  // element boundary keeps every sidebar assertion (positive controls and
  // the hide) — it only stops auditing main-content links the contract
  // explicitly allows. NOT a weakening: the sidebar itself is still fully
  // checked.
  const sidebarStart = html.indexOf('class="shell-sidebar"');
  expect(sidebarStart).toBeGreaterThanOrEqual(0);
  const sidebarEnd = html.indexOf("</aside>", sidebarStart);
  expect(sidebarEnd).toBeGreaterThan(sidebarStart);
  const sidebarHtml = html.slice(sidebarStart, sidebarEnd);
  expect(sidebarHtml).toContain('href="/stocks"');
  expect(sidebarHtml).toContain('href="/rishis"');
  // The hide: no methodology link inside the sidebar region.
  expect(sidebarHtml).not.toContain('href="/methodology"');
});

test("/methodology remains a coherent public route (direct URL access)", async ({ request }) => {
  const res = await request.get("/methodology");
  expect(res.status()).toBe(200);
  const html = await res.text();
  // Content positive control, not just a 200: the index actually renders
  // its methodology heading.
  expect(html.toLowerCase()).toContain("methodology");
});

test("every stock page STILL links /methodology from its footer (contextual transparency)", async ({ request }) => {
  const res = await request.get("/stock/SBIN");
  expect(res.status()).toBe(200);
  const html = await res.text();
  // positive control for the link below: the footer bar renders its label
  expect(html).toContain("Methodology");
  expect(html).toContain('href="/methodology"');
});
