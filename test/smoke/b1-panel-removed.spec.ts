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
 * check): the Rishi Council renders unchanged — the removal took one
 * section, not the page.
 */
import { test, expect } from "@playwright/test";

test.describe("INT-B1 stock-page surface REMOVED per founder order (2026-10-10)", () => {
  test("the stock page carries NO Rishi Intelligence section — the surrounding page renders unchanged", async ({ page }) => {
    const thesisCalls: string[] = [];
    page.on("response", (r) => {
      if (r.url().includes("/api/intelligence") && r.url().includes("capability=thesis")) {
        thesisCalls.push(`${r.status()} ${r.url()}`);
      }
    });

    await page.goto("/stock/RELIANCE");

    // positive control FIRST: the surviving sections render unchanged
    // (the heading is RishiCouncil.tsx's
    // "Rishi Council — Consensus & Dissent").
    await expect(page.getByText("Rishi Council — Consensus & Dissent")).toBeVisible({ timeout: 20_000 });

    // THE ABSENCE PINS: no panel section skeleton anywhere in the DOM.
    // (Pre-removal each was 1 — the SSR skeleton, its aria label, and the
    // "Rishi Intelligence" h2; the RED.)
    expect(await page.locator("section[data-intelligence-panel]").count()).toBe(0);
    expect(await page.locator('[aria-label="Rishi intelligence"]').count()).toBe(0);
    expect(await page.getByText("Rishi Intelligence", { exact: true }).count()).toBe(0);

    // the substrate stays, the surface does not: the stock page wires NO
    // capability=thesis fetch anymore (the panel was this page's only
    // intelligence consumer; the exact-surface scan pins the two remaining
    // surfaces — the C1 brief and the D2 drawer — on their own pages).
    expect(thesisCalls.length).toBe(0);
  });
});
