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
 * check): the page's own honest content renders. Round-46 P0-1 (founder
 * audit 2026-10-11: "Seed rows show no verdict") suppressed the Rishi
 * Council on seed data — the control is now the NO-VERDICT record, which
 * ALSO proves the P0-1 gate itself is live on the rendered page.
 */
import { test, expect } from "@playwright/test";

test.describe("INT-D3 REMOVED per founder order (2026-10-10)", () => {
  test("the stock page carries NO dossier section — the honest no-verdict record renders (the B1 panel and the council joined the removals)", async ({ page }) => {
    const insightCalls: string[] = [];
    page.on("response", (r) => {
      if (r.url().includes("/api/intelligence") && r.url().includes("capability=insight")) {
        insightCalls.push(`${r.status()} ${r.url()}`);
      }
    });

    await page.goto("/stock/RELIANCE");

    // positive control FIRST: the no-verdict record renders (the P0-1
    // verdict gate is live: the record's dataQuality is 'seed' and the
    // page says so instead of scoring it. The council was the original
    // control until the round-46 P0-1 order suppressed verdicts on seed).
    //
    // Main-scoped (NOVERDICT-SMOKE-SCOPE, 2026-10-12): the SECOND live
    // strike of the streaming-reveal race #376 fixed for b1-panel-removed
    // — this spec carried the same bare strict locator and failed the
    // same way on FD-23's CI run (04:12:33Z: 2 elements, one in <main>,
    // one in React's off-main hidden completion container). Same rule-23
    // justification: the pin's contract is the record VISIBLE in the
    // page's main content, not a DOM-uniqueness claim against a hydration
    // transient. This was the LAST bare instance (smoke.spec.ts:53 already
    // uses .first(); b1-panel-removed.spec.ts is main-scoped since #376).
    await expect(page.getByRole("main").getByText("NO VERDICT — ILLUSTRATIVE SEED DATA")).toBeVisible({ timeout: 20_000 });

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
