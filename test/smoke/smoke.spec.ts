/**
 * T16 smoke: the four core surfaces render (against `npm run start`).
 * Run: npx playwright install chromium && npx playwright test
 */
import { test, expect } from "@playwright/test";

test.describe("smoke — core surfaces", () => {
  test("dashboard renders the ranked Top Buy section", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Rishi/i);
    // R1: rankings on placeholder data carry the mandated illustrative-data
    // label; the former "as of <date>" caption was a false freshness claim
    // and must NOT be rendered.
    // SM (2026-10-06): the ranked trio is a LAZY CLIENT CHUNK (next/dynamic,
    // the Z5 bundle split) — it renders after chunk load + hydration, which
    // can exceed the default 5s expect timeout on a loaded CI runner. Two
    // real CI failures (PR #209 2026-10-06T00:36Z, PR #212 2026-10-06T04:13Z)
    // were exactly this: 35 passed / 1 failed, element not found at 5s while
    // the section renders. Same timeout its sibling assertions already use
    // (the /stocks table and consensus-hero tests both wait 20s). The CHECK
    // is unchanged — only the wait now covers the lazy chunk's real cost.
    await expect(page.getByText(/Illustrative sample data/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/as of \d{4}-\d{2}-\d{2}/i).first()).toHaveCount(0);
  });

  test("stocks table renders with null-safe consensus", async ({ page }) => {
    await page.goto("/stocks");
    await expect(page.locator("table").first()).toBeVisible({ timeout: 20_000 });
    // Audit retest 2026-10-02, C.3: the sector filter <select> had no
    // accessible name (Lighthouse select-name fail). An aria-label is the
    // fix a screen reader announces for a label-less select.
    await expect(page.locator("select").first()).toHaveAttribute(
      "aria-label",
      "Filter by sector"
    );
  });

  test("stock page for RELIANCE renders the consensus hero", async ({ page }) => {
    await page.goto("/stock/RELIANCE");
    await expect(page.getByText(/RISHI CONSENSUS/i).first()).toBeVisible({ timeout: 20_000 });
  });

  // SR (2026-10-06): /screener is the legacy URL for the renamed Stocks
  // surface — it must 308-redirect to /stocks (query strings preserved),
  // never 404 and never render a second canonical copy.
  test("legacy /screener URL redirects to /stocks (query preserved)", async ({ page }) => {
    const res = await page.goto("/screener?q=pe%3C20");
    expect(res?.status()).toBeLessThan(400); // followed redirect -> 200 at /stocks
    expect(page.url()).toContain("/stocks");
    expect(page.url()).toContain("q=pe%3C20");
    await expect(page.locator("table").first()).toBeVisible({ timeout: 20_000 });
  });

  // X3 (Round 11): the FIRST BYTE must never carry the fetching states the
  // W5 audit found live ("⟳ FETCHING" on stock tiles, "Connecting…" and the
  // env-var banner on the dashboard). These assertions fetch the raw SSR
  // HTML (page.request — no browser, no hydration), which is exactly what
  // the founder's curl acceptance measures. The honest states are the
  // cached observation (with its own observation time) or "UNAVAILABLE".
  test("first byte honesty: no FETCHING / Connecting / env-var banner in SSR HTML", async ({ page }) => {
    const stock = await page.request.get("/stock/RELIANCE");
    expect(stock.status()).toBe(200);
    const stockHtml = await stock.text();
    expect(stockHtml).not.toContain("FETCHING");

    const home = await page.request.get("/");
    expect(home.status()).toBe(200);
    const homeHtml = await home.text();
    expect(homeHtml).not.toContain("Connecting");
    expect(homeHtml).not.toContain("RANKINGS_ENABLED");
  });

  // Audit M6/B.3: canonical + Open Graph were absent sitewide (0 occurrences
  // on every probed page) — parameterized URLs could split crawl equity and
  // link unfurls rendered bare.
  test("home and stock pages emit canonical + Open Graph tags", async ({ page }) => {
    await page.goto("/");
    // Next (trailingSlash: false) normalizes the root canonical without a
    // trailing slash — assert the emitted form, not a hand-written one.
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://rishi-terminal.vercel.app"
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:url"]')).toHaveCount(1);

    await page.goto("/stock/RELIANCE");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://rishi-terminal.vercel.app/stock/RELIANCE"
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
  });

  test("F&O backtester shows an honest empty state without data", async ({ page }) => {
    await page.goto("/fno/backtester");
    // T1: fabricated F&O results removed — page renders without fake tables
    await expect(page.locator("body")).toBeVisible();
  });
});
