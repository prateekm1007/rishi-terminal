/**
 * BCRUMB (founder direction 3, 2026-10-10): the /stocks breadcrumb read
 * `RISHI › SCREENER` — a stale label from the pre-canonical-route era.
 * /screener 308-redirects to /stocks (next.config.ts); the canonical
 * route's breadcrumb must name the canonical page: STOCKS.
 *
 * The route-crawl pin: the RAW first byte of /stocks (the request fixture
 * never runs JS — the breadcrumb is server-rendered) must carry the
 * STOCKS breadcrumb terminal and must NOT carry the stale SCREENER one.
 * Positive control first (B-18): the breadcrumb structure itself is
 * asserted present (the RISHI root link), so the absence assertion can
 * never pass because the whole breadcrumb is missing.
 *
 * Fail-first: RED on the pre-fix tree (raw capture in
 * docs/evidence/round43/red-bcrumb.txt).
 */
import { test, expect } from "@playwright/test";

test("BCRUMB: the /stocks breadcrumb names the canonical page (STOCKS), not the stale SCREENER", async ({ request }) => {
  const res = await request.get("/stocks");
  expect(res.status()).toBe(200);
  const html = await res.text();

  // positive control: the breadcrumb itself is present — the RISHI root
  // link followed by the separator and the terminal span (the structure
  // the stale label lived in; if the breadcrumb were missing entirely,
  // both assertions below would be vacuous).
  expect(html).toMatch(/<p class="page-breadcrumb"><a [^>]*href="\/"[^>]*>RISHI<\/a><span[^>]*>›<\/span><span>(STOCKS|SCREENER)<\/span><\/p>/);

  // the canonical label
  expect(html).toContain("<span>STOCKS</span>");
  // the stale label is gone
  expect(html).not.toContain("<span>SCREENER</span>");
});
