/**
 * DEMO-6 (founder order, 2026-10-12; issue #364): the honest demo path
 * spec — search, verdict view, dissent expand, flip expand, watchlist add.
 *
 *   "Until real data exists, it asserts the honest empty states."
 *
 * The demo path walks the five interactions a live demo performs, and on
 * the CURRENT record set every verdict-bearing surface must show the
 * honest record (P0-1: seed rows show no verdict; the founder-worded
 * empty states). Runs green on main — the honest states ARE the correct
 * states today. When licensed live data lands, the same path must show
 * the full verdict record instead (the spec flips with the data contract,
 * not before).
 *
 * Lessons from the two live strict-mode strikes (#376, #380): every
 * locator is main-content-scoped or .first() — the off-main hidden
 * streaming-completion container must never double-match.
 */
import { test, expect } from "@playwright/test";

test.describe("demo path — the honest walk (DEMO-6)", () => {
  test("search finds a stock and lands on its honest record", async ({ page }) => {
    await page.goto("/");
    const search = page.getByLabel("Search instruments").first();
    await search.click({ force: true });
    await search.fill("RELIANCE");
    // the dropdown renders results; navigate with a click
    await expect(page.getByLabel("Search results")).toBeVisible({ timeout: 15_000 });
    await page.getByLabel("Search results").getByText(/RELIANCE/i).first().click();
    await expect(page).toHaveURL(/\/stock\/RELIANCE/, { timeout: 20_000 });
  });

  test("verdict view: the seed record is the honest no-verdict record", async ({ page }) => {
    await page.goto("/stock/RELIANCE");
    const main = page.locator("main");
    // P0-1: the seed record replaces every verdict surface
    await expect(main.getByText(/NO VERDICT — ILLUSTRATIVE SEED DATA/i).first()).toBeVisible({ timeout: 20_000 });
    // the verdict sections stay suppressed on seed data
    await expect(main.getByText(/RISHI COMMENTARY/i)).toHaveCount(0);
    await expect(main.getByText(/Pillar Breakdown/i)).toHaveCount(0);
    // the honest surfaces that DO render on seed data (B-18 controls)
    await expect(main.getByText(/Key Metrics/i).first()).toBeVisible();
    await expect(main.getByText(/Peer Comparison/i).first()).toBeVisible();
  });

  test("dissent expand: the wisdom tab opens and a Rishi card expands honestly", async ({ page }) => {
    await page.goto("/stock/RELIANCE");
    const main = page.locator("main");
    await main.getByText(/Rishi Wisdom/i).first().click({ timeout: 20_000 });
    // the grid renders the council; the first card expands to its detail
    const firstCard = main.locator("[class*='cursor-pointer']").first();
    await firstCard.click();
    // the expanded body renders the framework's honest detail — on seed
    // data every score is null and the card says so (P0-2/P0-5 records)
    await expect(main.getByText(/Inspired by/i).first()).toBeVisible();
  });

  test("flip expand: the honest state on seed data is the no-verdict record", async ({ page }) => {
    await page.goto("/stock/RELIANCE");
    const main = page.locator("main");
    await main.getByText(/Rishi Wisdom/i).first().click({ timeout: 20_000 });
    const firstCard = main.locator("[class*='cursor-pointer']").first();
    await firstCard.click();
    // KNOWN SHAPE (DEMO-5 finding): the flip-conditions VIEW is the dead
    // RishiCouncil component (zero importers) — the live flip content is
    // the expanded card's threshold language. On seed data NO verdict
    // exists, so there is NOTHING to flip: the honest state is the
    // no-verdict record — never a fabricated flip path.
    await expect(main.getByText(/NO VERDICT — ILLUSTRATIVE SEED DATA/i).first()).toBeVisible();
    // the dead flip-conditions surface must NOT resurrect silently
    expect(await main.getByText(/no single-input path to a pass/i).count()).toBeLessThanOrEqual(1);
  });

  test("watchlist add: the anonymous lab accepts a symbol and shows the row", async ({ page }) => {
    await page.goto("/lab");
    const input = page.locator("input[placeholder*='symbol']").first();
    await input.waitFor({ state: "visible", timeout: 20_000 });
    await input.fill("RELIANCE");
    await input.press("Enter");
    // the honest row renders with the added symbol
    await expect(page.locator("main").getByText(/RELIANCE/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
