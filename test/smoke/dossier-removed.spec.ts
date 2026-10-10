/**
 * INT-D3 REMOVED — the founder's product-surface removal order (round 45,
 * 2026-10-10): the stock-page dossier section (the D3 mount) is REMOVED
 * from /stock/[symbol]. This spec pins the REMOVAL on the rendered page.
 *
 * Fail-first in reverse (rule 21): written BEFORE the removal and watched
 * FAIL on the mounted tree — the dossier component ALWAYS renders its
 * section skeleton (`<section data-dossier-insight=... data-dossier-subject=...
 * aria-label="Rishi stock dossier">`), even in the pre-window honest-absent
 * phase, so the absence pin below genuinely bit pre-removal (1 section
 * present) and only passes post-removal. Raw RED + GREEN:
 * docs/evidence/round45/.
 *
 * Positive control FIRST (B-18 — a missing section passes any absence
 * check): the B1 thesis panel above and the Rishi Council render
 * unchanged — the removal took one section, not the page. The panel uses
 * the ATOMIC settled-state poll (the R43 discipline the panel/brief
 * specs carry; a transient hydration double is absorbed while a
 * PERSISTENT double or a stuck loading state still fails).
 */
import { test, expect } from "@playwright/test";

test.describe("INT-D3 REMOVED per founder order (2026-10-10)", () => {
  test("the stock page carries NO dossier section — the B1 panel and council render unchanged", async ({ page }) => {
    const insightCalls: string[] = [];
    page.on("response", (r) => {
      if (r.url().includes("/api/intelligence") && r.url().includes("capability=insight")) {
        insightCalls.push(`${r.status()} ${r.url()}`);
      }
    });

    await page.goto("/stock/RELIANCE");

    // positive control FIRST: the always-on B1 thesis panel is present
    // and settled (atomic poll — count==1 AND phase settled per pass).
    const panel = page.locator("section[data-intelligence-panel]");
    await expect(async () => {
      const count = await panel.count();
      expect(count).toBe(1);
      const panelPhase = await panel.getAttribute("data-intelligence-panel");
      expect(panelPhase === "loading").toBe(false);
      expect(["ready", "unavailable"]).toContain(panelPhase ?? "");
    }).toPass({ timeout: 20_000 });

    // second positive control: the surrounding sections render unchanged
    // (council present — the removal removed ONE section, not the page;
    // the heading is RishiCouncil.tsx's "Rishi Council — Consensus & Dissent").
    await expect(page.getByText("Rishi Council — Consensus & Dissent")).toBeVisible({ timeout: 20_000 });

    // THE ABSENCE PIN: no dossier section skeleton anywhere in the DOM.
    // (Pre-removal this was 1 — the honest-absent skeleton; the RED.)
    expect(await page.locator("section[data-dossier-insight]").count()).toBe(0);
    expect(await page.locator('[aria-label="Rishi stock dossier"]').count()).toBe(0);

    // the substrate stays: the stock page mounts NO insight fetch anymore
    // (the dossier was the ONLY capability=insight consumer; the exact-
    // surface scan now expects zero insight fetches from this page).
    expect(insightCalls.length).toBe(0);

    // the affordance cannot exist without the dossier mount
    expect(await page.locator("[data-ask-rishi]").count()).toBe(0);
  });
});
