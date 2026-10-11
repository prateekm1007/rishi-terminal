/**
 * INT-B1 stock-page surface REMOVED — the founder's second removal order
 * (round 45, 2026-10-10): after the D3 dossier removal the stock page STILL
 * rendered the section headed "Rishi Intelligence" (the B1 IntelligencePanel
 * mount — the dossier's surviving neighbor), and the founder ordered it
 * removed. This spec pins the REMOVAL on the rendered page.
 *
 * Fail-first in reverse (rule 21): written BEFORE the removal and watched
 * FAIL on the mounted tree — the panel ALWAYS renders its section skeleton
 * in the SSR bytes (`<section class="stock-intelligence-panel"
 * data-intelligence-panel=... data-intelligence-subject=...
 * aria-label="Rishi intelligence">` with the exact "Rishi Intelligence"
 * h2), so every absence pin below genuinely bites pre-removal.
 * Raw RED + GREEN: docs/evidence/round45/.
 *
 * Positive control FIRST (B-18 — a missing section passes any absence
 * check): the page's own honest content renders. Round-46 P0-1 (founder
 * audit 2026-10-11: "Seed rows show no verdict") suppressed the Rishi
 * Council on seed data — the control is now the NO-VERDICT record, which
 * ALSO proves the P0-1 gate itself is live on the rendered page.
 */
import { test, expect } from "@playwright/test";

test.describe("INT-B1 stock-page surface REMOVED per founder order (2026-10-10)", () => {
  test("the stock page carries NO Rishi Intelligence section — the honest no-verdict record renders", async ({ page }) => {
    const thesisCalls: string[] = [];
    page.on("response", (r) => {
      if (r.url().includes("/api/intelligence") && r.url().includes("capability=thesis")) {
        thesisCalls.push(`${r.status()} ${r.url()}`);
      }
    });

    await page.goto("/stock/RELIANCE");

    // positive control FIRST: the no-verdict record renders (the P0-1
    // verdict gate is live: the record's dataQuality is 'seed' and the
    // page says so instead of scoring it).
    await expect(page.getByText("NO VERDICT — ILLUSTRATIVE SEED DATA")).toBeVisible({ timeout: 20_000 });

    // THE ABSENCE PINS: no panel section skeleton anywhere in the DOM.
    // (Pre-removal each was 1 — the SSR skeleton, its aria label, and the
    // "Rishi Intelligence" h2; the RED.)
    expect(await page.locator("section[data-intelligence-panel]").count()).toBe(0);
    expect(await page.locator('[aria-label="Rishi intelligence"]').count()).toBe(0);
    expect(await page.getByText("Rishi Intelligence", { exact: true }).count()).toBe(0);

    // the substrate stays, the surface does not: the stock page wires NO
    // capability=thesis fetch anymore (the panel was this page's only
    // intelligence consumer; the exact-surface scan pins the one remaining
    // product surface — the D2 drawer — on its own page (the C1 brief was
    // the other of the two when this spec was written; the founder's third
    // removal order took it off the dashboard on 2026-10-11).
    expect(thesisCalls.length).toBe(0);
  });
});
