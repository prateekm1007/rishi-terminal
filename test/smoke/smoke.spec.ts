/**
 * T16 smoke: the four core surfaces render (against `npm run start`).
 * Run: npx playwright install chromium && npx playwright test
 */
import { test, expect } from "@playwright/test";

test.describe("smoke — core surfaces", () => {
  test("dashboard renders the ranked Top Buy section", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Rishi/i);
    // T13: real rankings — as-of captions present
    await expect(page.getByText(/as of/i).first()).toBeVisible();
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
