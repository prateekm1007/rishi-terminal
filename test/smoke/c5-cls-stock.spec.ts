/**
 * R16 C5 — stock-page CLS: late price attribution must not move the page.
 *
 * Founder Round-16 C5 (Lighthouse, mobile): /stock/BANKBARODA CLS 0.053 —
 * the Lighthouse layout-shift trace names the cause: the price tile's
 * observation line ("Delayed · Yahoo Finance (unofficial)") and the 52W
 * range bar render only once the client price fetch lands, so the tile
 * GROWS and pushes the whole content-wrapper down.
 *
 * This spec loads the stock page with the batch-price route delayed by
 * ~1.2 s (the cold-cache ISR shape: SSR paints the honest "—" state, the
 * mount fetch fills the observation afterwards) and asserts the page does
 * not shift (total CLS from layout-shift entries < 0.01).
 *
 * Fail-first (rule 21): on the pre-fix build this spec measured CLS
 * ≈ 0.05 (content-wrapper move); see the PR's Proof section.
 */
import { test, expect } from "@playwright/test";

test("stock page: late price attribution does not shift layout (CLS < 0.01)", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __cls: number[] }).__cls = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        (window as unknown as { __cls: number[] }).__cls.push((entry as PerformanceEntry & { value: number }).value);
      }
    }).observe({ type: "layout-shift", buffered: true });
  });

  await page.route("**/api/prices/batch*", async (route) => {
    // Late fill: the mount fetch resolves well after first paint.
    await new Promise((r) => setTimeout(r, 1200));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        market: { open: true, sessionDate: "2026-10-05" },
        BANKBARODA: {
          price: 257.4,
          change: 1.2,
          changePercent24h: 0.47,
          source: "yahoo-bulk",
          status: "CACHED",
          observedAt: new Date().toISOString(),
        },
      }),
    });
  });

  await page.goto("/stock/BANKBARODA", { waitUntil: "load" });
  // Let the delayed fetch + the widget re-render settle.
  await page.waitForTimeout(3000);

  const cls = (await page.evaluate(() =>
    (window as unknown as { __cls: number[] }).__cls.reduce((a, b) => a + b, 0),
  )) as number;

  // Positive control (C10): the page really is the stock page and the
  // price tile really did receive the late observation.
  await expect(page.locator("main.shell-main")).toBeVisible();
  const sawAttribution = await page.evaluate(() =>
    document.body.innerText.includes("Yahoo Finance (unofficial)"),
  );
  expect(sawAttribution).toBe(true);

  expect(cls).toBeLessThan(0.01);
});
