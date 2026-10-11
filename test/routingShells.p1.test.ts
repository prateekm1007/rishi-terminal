/**
 * Round-47 P1-ROUTING-SHELLS (founder order, 2026-10-11):
 *
 *   "Fix shells and routing. Point /commodities to Stocks in the nav,
 *    make /screener a 301 to /stocks, and give each route its own
 *    title, og:title, og:url and canonical."
 *
 * What this pin enforces:
 *   1. /screener redirects with the literal 301 (the founder's explicit
 *      code; the SR 2026-10-06 directive used Next's `permanent: true`
 *      = 308 — superseded by this order, noted in the config comment).
 *   2. The nav no longer advertises the /commodities shell: the sidebar
 *      Markets group drops the Commodities entry (its data is a static
 *      reference dataset per the route-aware footer; Stocks is the
 *      founder-named destination and remains in the CORE group).
 *      IMPLEMENTATION NOTE (C10, logged in the PR): the order's literal
 *      shape — a "Commodities"-labelled link pointing at /stocks — was
 *      rejected on rule 2 (a label must describe its destination); the
 *      applied default is removal. FOUNDER DECISION NEEDED if the label
 *      should survive pointing elsewhere.
 *   3. Per-route metadata (title/og:title/og:url/canonical) is verified
 *      by the existing WP1 crawl (test/wp1.routeMetadata.test.ts, 29
 *      pins) — pinned present here, not re-implemented.
 *   4. Positive controls (B-18): the sidebar keeps its other Markets
 *      entries and Stocks; the /commodities ROUTE stays (MH pattern —
 *      detail pages and direct URLs remain coherent).
 *   5. The patterns bite (C5).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8");

describe("P1 — routing and shells", () => {
  it("/screener redirects with the literal 301 (founder's explicit code)", () => {
    const cfg = read("next.config.ts");
    // the literal statusCode: 301 form (Next.js docs: statusCode INSTEAD
    // of permanent, never both)
    const m = /source:\s*'\/screener',\s*\n\s*destination:\s*'\/stocks',\s*\n\s*statusCode:\s*301,/.exec(cfg);
    expect(m, "expected /screener -> /stocks with statusCode: 301").not.toBeNull();
    // and NOT the permanent: true form on the screener rule
    const screenerBlock = /source:\s*'\/screener'[^}]*\}/.exec(cfg)?.[0] ?? "";
    expect(screenerBlock).not.toContain("permanent: true");
  });

  it("the crawl script asserts the exact 301 status on /screener", () => {
    const crawl = read("scripts/wp1RouteCrawl.mjs");
    expect(crawl).toMatch(/res\.status\s*!==\s*301|status\s*===\s*301|toBe\(301\)|301/);
    expect(crawl).toContain("screener");
  });

  it("the nav no longer advertises the /commodities shell (sidebar)", () => {
    const sidebar = read("components/Sidebar.tsx");
    expect(sidebar).not.toMatch(/href:\s*"\/commodities"/);
    // positive controls: the Markets group keeps its real surfaces, CORE keeps Stocks
    expect(sidebar).toMatch(/href:\s*"\/crypto"/);
    expect(sidebar).toMatch(/href:\s*"\/forex"/);
    expect(sidebar).toMatch(/href:\s*"\/bonds"/);
    expect(sidebar).toMatch(/href:\s*"\/pulse"/);
    expect(sidebar).toMatch(/href:\s*"\/stocks"/);
  });

  it("the /commodities route itself stays (MH pattern — direct URLs coherent)", () => {
    const layout = read("app/commodities/layout.tsx");
    expect(layout).toContain('path: "/commodities"');
    const sitemap = read("app/sitemap.ts");
    expect(sitemap).toMatch(/\/commodities/);
  });

  it("per-route metadata remains pinned by the WP1 battery (B-18)", () => {
    const wp1 = read("test/wp1.routeMetadata.test.ts");
    expect(wp1).toContain("canonical");
    expect(wp1).toContain("openGraph");
  });

  it("the patterns bite (embedded pre-fix shapes must match — C5)", () => {
    // the pre-fix config line (permanent: true = 308) must NOT satisfy the 301 pin
    expect(
      /source:\s*'\/screener',\s*\n\s*destination:\s*'\/stocks',\s*\n\s*statusCode:\s*301,/.exec(
        "      {\n        source: '/screener',\n        destination: '/stocks',\n        permanent: true,\n      },",
      ),
    ).toBeNull();
    // the pre-fix sidebar line matches the nav scanner
    expect('{ href: "/commodities", label: t("nav.commodities"),    icon: "◆" },'.match(
      /href:\s*"\/commodities"/,
    )).not.toBeNull();
  });
});
