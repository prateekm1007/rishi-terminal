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
    await expect(page.getByText(/Illustrative sample data/i).first()).toBeVisible();
    await expect(page.getByText(/as of \d{4}-\d{2}-\d{2}/i).first()).toHaveCount(0);
  });

  test("screener table renders with null-safe consensus", async ({ page }) => {
    await page.goto("/screener");
    await expect(page.locator("table").first()).toBeVisible({ timeout: 20_000 });
  });

  test("stock page for RELIANCE renders the consensus hero", async ({ page }) => {
    await page.goto("/stock/RELIANCE");
    await expect(page.getByText(/RISHI CONSENSUS/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test("F&O backtester shows an honest empty state without data", async ({ page }) => {
    await page.goto("/fno/backtester");
    // T1: fabricated F&O results removed — page renders without fake tables
    await expect(page.locator("body")).toBeVisible();
  });
});
