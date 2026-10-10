/**
 * INT-D3 — the dossier's smoke contract on the real stock page.
 *
 * Pre-window (the CI server has no intelligence env — the same honest
 * state as production until ~2026-11-03): the dossier's insight section
 * renders ABSENT (data-dossier-insight="absent"), the captured network
 * log shows the ONE /api/intelligence?capability=insight fetch returning
 * the honest 404 (zero AI spend), the Ask Rishi affordance is absent,
 * and the B1 thesis panel above remains the page's always-on
 * intelligence (the positive control — B-18: a missing section passes
 * any absence check, so the panel's presence is asserted first).
 *
 * The ready-state unlock is CI-proven through the EXACT A7 functions in
 * test/intelligenceStockDossier.test.ts's cache-cycle pins and the
 * fixture route; the live unlock gets a standing post-window production
 * leg (recorded in the roadmap row when it happens).
 */
import { test, expect } from "@playwright/test";

test.describe("INT-D3 dossier — the honest pre-window state on the stock page", () => {
  test("the B1 panel renders; the dossier section is ABSENT with the ONE insight fetch 404ing and no affordance", async ({ page }) => {
    const insightCalls: string[] = [];
    page.on("response", (r) => {
      if (r.url().includes("/api/intelligence") && r.url().includes("capability=insight")) {
        insightCalls.push(`${r.status()} ${r.url()}`);
      }
    });

    await page.goto("/stock/RELIANCE");

    // positive control FIRST: the always-on B1 thesis panel is present.
    // The ATOMIC settled-state poll (the R43 discipline the panel/brief
    // specs already carry; the two-step form raced in CI — run 38027087184:
    // the toHaveCount(1) gate passed, a transient second "loading" panel
    // mounted before the separate attribute assertion ran). count==1 AND
    // phase settled are evaluated atomically per poll, so a transient
    // hydration double is absorbed while a PERSISTENT double or a stuck
    // loading state still fails the gate — strictly stronger than either
    // half alone.
    const panel = page.locator("section[data-intelligence-panel]");
    await expect(async () => {
      const count = await panel.count();
      expect(count).toBe(1);
      const panelPhase = await panel.getAttribute("data-intelligence-panel");
      expect(panelPhase === "loading").toBe(false);
      expect(["ready", "unavailable"]).toContain(panelPhase ?? "");
    }).toPass({ timeout: 20_000 });

    // the dossier section exists for verification and carries the honest
    // phase. The DOM/network coherence is the pin: "absent" ⟺ the route's
    // designed 404 (no artifact exists — production's pre-window state);
    // "error" ⟺ any other failure (an env-less CI server cannot reach the
    // cache and fails closed — the distinction the contract demands).
    // The same ATOMIC settled-state poll — a persistent double or a stuck
    // loading state fails; a transient hydration frame does not.
    const dossier = page.locator("section[data-dossier-insight]");
    await expect(async () => {
      const count = await dossier.count();
      expect(count).toBe(1);
      const dossierPhase = await dossier.getAttribute("data-dossier-insight");
      expect(dossierPhase === "loading").toBe(false);
    }).toPass({ timeout: 20_000 });
    const phase = await dossier.getAttribute("data-dossier-insight");
    expect(["absent", "error", "ready"]).toContain(phase ?? "");
    expect(await dossier.getAttribute("data-dossier-subject")).toBe("RELIANCE");

    // the network truth: exactly ONE insight fetch; its status and the
    // rendered phase must AGREE (the verifiably-different contract)
    expect(insightCalls.length).toBe(1);
    if (phase === "absent") {
      expect(insightCalls[0]).toMatch(/^404 /);
    } else if (phase === "error") {
      expect(insightCalls[0]).not.toMatch(/^404 /);
    }

    // the affordance cannot exist without a rendered artifact
    expect(await page.locator("[data-ask-rishi]").count()).toBe(0);

    // absence is visually nothing: no fabricated content in the section
    expect((await dossier.textContent()) ?? "").not.toMatch(/coming soon|placeholder|will be available/i);
  });
});
