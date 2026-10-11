/**
 * INT-C1 dashboard brief REMOVED — the founder's third removal order
 * (round 45, 2026-10-11): after the D3 dossier and the B1 stock-page panel
 * removals, the dashboard STILL renders a standing section headed
 * "Rishi Intelligence — <SYMBOL>" (the C1 DashboardBrief mount inside the
 * DashboardTail), and the founder ordered it removed ("remove the whole
 * Rishi Intelligence segment"). This spec pins the REMOVAL on the rendered
 * page.
 *
 * Fail-first in reverse (rule 21): written BEFORE the removal and watched
 * FAIL on the mounted tree — the brief ALWAYS mounts its section skeleton
 * on hydration (`<section data-dashboard-brief=... data-dashboard-brief-subject=...
 * aria-label="Rishi brief for today's pick">` with the exact
 * "Rishi Intelligence — <SYMBOL>" h2 — it rides the ssr:false tail chunk,
 * so the skeleton exists only after hydration). The tail-mounted wait is
 * LOAD-BEARING, not ceremony: the brief and the tail's own sections render
 * in the SAME client commit, so once a tail-owned marker is visible the
 * absence count cannot race a not-yet-mounted section (the spec's first
 * draft counted before the chunk loaded and passed vacuously on the
 * mounted tree — the B-18 trap; caught in the RED leg and corrected, the
 * corrected draft was watched FAIL pre-removal). Raw RED + GREEN:
 * docs/evidence/round45/.
 *
 * Positive control FIRST (B-18 — a missing section passes any absence
 * check): the tail's own TOP BUY SIGNALS section renders unchanged — its
 * visibility proves the ssr:false tail chunk mounted, and the removal
 * took one section inside that tail, not the tail.
 */
import { test, expect } from "@playwright/test";

test.describe("INT-C1 dashboard brief REMOVED per founder order (2026-10-11)", () => {
  test("the dashboard carries NO Rishi Intelligence section — the surrounding page renders unchanged", async ({ page }) => {
    const thesisCalls: string[] = [];
    page.on("response", (r) => {
      if (r.url().includes("/api/intelligence") && r.url().includes("capability=thesis")) {
        thesisCalls.push(`${r.status()} ${r.url()}`);
      }
    });

    await page.goto("/");

    // positive control FIRST: a TAIL-OWNED section renders unchanged. The
    // brief and this section mount in the same client commit (one
    // DashboardTail render), so this visibility is the settled-state gate
    // the absence pins below are evaluated after.
    await expect(page.getByText("TOP BUY SIGNALS")).toBeVisible({ timeout: 20_000 });

    // THE ABSENCE PINS: no brief section skeleton anywhere in the DOM.
    // (Pre-removal each was 1 — the hydrated tail skeleton and the
    // "Rishi Intelligence — <SYMBOL>" h2; the RED.)
    expect(await page.locator("section[data-dashboard-brief]").count()).toBe(0);
    expect(await page.getByText("Rishi Intelligence").count()).toBe(0);

    // the substrate stays, the surface does not: the dashboard wires NO
    // capability=thesis fetch anymore (the brief was this page's only
    // intelligence consumer; the exact-surface scan pins the one remaining
    // product surface — the D2 drawer — on its own page).
    expect(thesisCalls.length).toBe(0);
  });
});
