/**
 * INT-A8-PRES — the computed-style regression suite that reproduces the
 * founder's screenshot defect and pins the repair (direction: assert
 * computed styles or measurable layout, with positive controls proving
 * the content exists).
 *
 * Runs against `npm run start` in CI (the config's webServer — no
 * intelligence env, so the real surfaces render their HONEST
 * unavailable states; the fixture route renders READY compositions
 * from the canned fixtures) and against SMOKE_BASE_URL for production
 * verification. CI-deterministic by construction:
 *
 *   - /evidence-fixtures: READY A8 compositions — the badge row is a
 *     real flex row (no default bullets), badges are pills, sections
 *     carry the surface block, titles form a hierarchy, the prose
 *     fields are visible under their labels;
 *   - the real surfaces (brief, drawer): the honest
 *     empty/unavailable states are CLASS-styled (padding from the
 *     shared stylesheet, not browser default) and the drawer's close
 *     button has a DESIGNED :focus-visible state. [The stock-page
 *     panel leg was RETIRED 2026-10-10 — the founder's second removal
 *     order took the B1 panel off /stock/[symbol]; the rendered-page
 *     absence pins live in test/smoke/b1-panel-removed.spec.ts.]
 *
 * Fail-first: on the pre-implementation tree globals.css carries ZERO
 * insight-surface selectors — every computed-style pin below is
 * captured failing (browser defaults: list-item bullets, 0 padding,
 * outline-style auto).
 */
import { test, expect } from "@playwright/test";

test.describe("INT-A8-PRES fixture route — the shared presentation, computed", () => {
  test("badges are a grouped pill row with no default bullets; sections and titles carry the hierarchy", async ({ page }) => {
    await page.goto("/evidence-fixtures");
    const section = page.locator('[data-fixture="deterministicProvenance"]');
    await expect(section).toBeVisible();

    // positive control: the content the styles exist for is present
    await expect(section).toContainText("The price moved during the window; both sources agree.");
    await expect(section).toContainText("price: 3100.0 inr -> 3105.5 inr");

    const badgeRow = section.locator(".insight-surface__badges").first();
    const rowStyles = await badgeRow.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { display: cs.display, listStyle: cs.listStyleType, gap: cs.gap };
    });
    expect(rowStyles.display).toBe("flex");
    expect(rowStyles.listStyle).toBe("none");

    const badge = section.locator(".insight-badge").first();
    const badgeStyles = await badge.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { radius: cs.borderRadius, padding: cs.padding, border: cs.borderStyle, bg: cs.backgroundColor };
    });
    expect(badgeStyles.radius).not.toBe("0px");
    expect(badgeStyles.padding).not.toBe("0px");
    expect(badgeStyles.border).not.toBe("none");
    expect(badgeStyles.bg).not.toBe("rgba(0, 0, 0, 0)");

    const surface = section.locator(".insight-surface").first();
    const surfaceStyles = await surface.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { border: cs.borderTopWidth, bg: cs.backgroundColor, radius: cs.borderRadius };
    });
    expect(parseFloat(surfaceStyles.border)).toBeGreaterThan(0);
    expect(surfaceStyles.bg).not.toBe("rgba(0, 0, 0, 0)");

    const title = surface.locator(".insight-surface__title").first();
    const titleStyles = await title.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { weight: cs.fontWeight, size: parseFloat(cs.fontSize) };
    });
    expect(titleStyles.weight).toBe("700");
    expect(titleStyles.size).toBeGreaterThanOrEqual(12);

    const list = surface.locator(".insight-surface__list").first();
    if ((await list.count()) > 0) {
      const listStyle = await list.evaluate((el) => getComputedStyle(el).listStyleType);
      expect(listStyle).toBe("none");
    }
  });

  test("the prose fields are visible labelled content: Summary / Why it matters / What changed", async ({ page }) => {
    await page.goto("/evidence-fixtures");
    const section = page.locator('[data-fixture="deterministicProvenance"]');
    const summaryBlock = section.locator(".insight-surface--summary");
    await expect(summaryBlock).toBeVisible();

    const labels = (await summaryBlock.locator(".insight-surface__title").allInnerTexts()).map((t) => t.toUpperCase());
    expect(labels).toContain("SUMMARY");
    expect(labels).toContain("WHY IT MATTERS");
    expect(labels).toContain("WHAT CHANGED");

    // the prose is measurably present, not zero-height or hidden
    const prose = await summaryBlock.locator('[data-insight-summary="summary"]').evaluate((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { h: r.height, display: cs.display, visibility: cs.visibility };
    });
    expect(prose.display).not.toBe("none");
    expect(prose.visibility).not.toBe("hidden");
    expect(prose.h).toBeGreaterThan(0);

    // the honest what-changed empty state renders for an empty ledger
    // (INT-A8-REC: the exclusion truth, never an absence claim)
    const emptySection = page.locator('[data-fixture="emptyUncertainty"]');
    if ((await emptySection.count()) > 0) {
      await expect(emptySection).toContainText(
        "No observed transition qualified as material evidence in this window — the ledger records no field change.",
      );
    }
  });
});

test.describe("INT-A8-PRES real surfaces — honest states are styled, focus is designed", () => {
  // [RETIRED 2026-10-10] the stock-page panel leg ("the stock page panel
  // renders its honest state with the shared class styling") — the founder's
  // second product-surface removal order (round 45) took the B1
  // IntelligencePanel off /stock/[symbol] after the D3 dossier removal (the
  // page still showed a section headed "Rishi Intelligence"; the founder:
  // "it s still there remove it"). Rule 23: retirement on removal, never
  // silent deletion — the leg died WITH its subject; the honest-state
  // styling discipline continues on the surviving surfaces below (brief,
  // drawer) and on the fixture route above. Removal record:
  // docs/evidence/round45/b1-removal.md.

  test("the dashboard brief renders its honest state with the shared class styling", async ({ page }) => {
    await page.goto("/");
    const brief = page.locator("section[data-dashboard-brief]");
    // EXACTLY ONE brief, settled (the same torn-frame discipline as the
    // stock panel above — the brief mounts client-side via the ssr:false
    // tail chunk, so the section exists only after hydration). The same
    // SETTLED-STATE poll: count and phase evaluated atomically per poll.
    await expect(async () => {
      const count = await brief.count();
      expect(count).toBe(1);
      const phase = await brief.getAttribute("data-dashboard-brief");
      expect(phase === "loading").toBe(false);
      expect(["unavailable", "ready"]).toContain(phase ?? "");
    }).toPass({ timeout: 20_000 });
    await expect(brief).toBeVisible();
    const phase = await brief.getAttribute("data-dashboard-brief");
    if (phase === "unavailable") {
      await expect(brief).toContainText("Intelligence is not available for this subject right now.");
    }
    const empty = brief.locator(".insight-surface__empty").first();
    if ((await empty.count()) > 0) {
      const pad = await empty.evaluate((el) => parseFloat(getComputedStyle(el).paddingTop));
      expect(pad).toBeGreaterThan(0);
    }
  });

  test("the drawer's close button has a designed visible focus state (keyboard)", async ({ page }) => {
    // Deterministic returning-user state BEFORE navigation: the first-visit
    // disclaimer is localStorage-gated (LegalDisclaimer reads
    // 'rishi_disclaimer_v2'); pre-seeding it means the modal never mounts
    // and can never intercept the badge click (the CI flake this replaces).
    await page.addInitScript(() => window.localStorage.setItem("rishi_disclaimer_v2", "accepted"));
    await page.goto("/stocks", { waitUntil: "networkidle" });
    const badge = page.locator("[data-intelligence-badge]").first();
    // scope to the dialog element: the inner unavailable <p> also carries
    // the data attribute (the DOM contract discloses the phase on both).
    const drawer = page.locator('[role="dialog"][data-intelligence-drawer]');
    await badge.click();
    await drawer.waitFor({ state: "attached", timeout: 15_000 });
    await expect(drawer).toBeVisible();
    // establish keyboard modality, then focus the close control: the
    // designed rule (scoped to the drawer panel) must produce a solid,
    // visible outline — the browser default 'auto' is not a designed state.
    await page.keyboard.press("Tab");
    const close = page.getByRole("button", { name: "Close intelligence drawer" });
    await close.focus();
    const focus = await close.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        focusVisible: el.matches(":focus-visible"),
        outlineStyle: cs.outlineStyle,
        outlineWidth: parseFloat(cs.outlineWidth),
      };
    });
    expect(focus.focusVisible).toBe(true);
    expect(focus.outlineStyle).toBe("solid");
    expect(focus.outlineWidth).toBeGreaterThanOrEqual(2);
    // close works: the drawer detaches
    await close.click();
    await expect(drawer).toHaveCount(0);
  });
});
