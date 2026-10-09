/**
 * INT-A8 shared-surface repair (2026-10-10) — the Playwright regression
 * tests for the presentation defect the D2 production legs exposed.
 *
 * Directive 9 (founder, 2026-10-10): reproduce the screenshot — no
 * default bullets, grouped badges, deliberate hierarchy, visible
 * summary/whatChanged, honest unknown/low/no-model states unchanged,
 * no invented facts or advice — asserted through COMPUTED STYLES and
 * measurable layout, with positive controls proving the content exists.
 *
 * The three product surfaces mount behind /api/intelligence; the smoke
 * environment runs seed-only (no DB), where the route answers the
 * honest 503 and the surfaces render their unavailable states. To
 * assert the READY-state composition, this spec intercepts the route
 * and serves the ONE fixture source (lib/intelligence/
 * evidenceFixtures.ts — parse-valid by construction, the same source
 * the /evidence-fixtures route renders; the c5-cls-stock route-mock
 * precedent). The mock is labelled per test; the surfaces' real
 * network behavior is pinned by the D2 production legs and the drawer
 * unit pins.
 */
import { expect, test } from "@playwright/test";

// The fixture artifacts (the ONE fixture source, inlined here as plain
// objects so the spec stays self-contained against the built app; the
// source of truth stays lib/intelligence/evidenceFixtures.ts and the
// /evidence-fixtures spec pins that route's parity).
const DETERMINISTIC_ARTIFACT = {
  id: "insight:stock-intelligence:TCS:delta-2026-10-07",
  feature: "stock-intelligence",
  subject: "TCS",
  generatedAt: "2026-10-07T09:30:00.000Z",
  observationWindow: { from: "2026-10-07T04:00:00.000Z", to: "2026-10-07T09:30:00.000Z" },
  status: "ok",
  confidence: "high",
  materiality: "low",
  summary: "The price moved during the window; both sources agree.",
  whyItMatters: "An agreed price move is the baseline every downstream judgement starts from.",
  whatChanged: [{ field: "price", change: "3100.0 inr -> 3105.5 inr" }],
  invalidators: ["A restated prior close"],
  evidence: [
    {
      id: "price:TCS:src-a",
      text: "price = 3100.0 inr at window open",
      facts: [{ field: "price", value: 3100.0, unit: "inr", source: "live", observedAt: "2026-10-07T04:00:00.000Z" }],
    },
    {
      id: "price:TCS:src-b",
      text: "price = 3105.5 inr at window close",
      facts: [{ field: "price", value: 3105.5, unit: "inr", source: "live", observedAt: "2026-10-07T09:30:00.000Z" }],
    },
  ],
  contradictions: [],
  uncertainty: [],
  nextInvestigations: [],
  provenance: { synthesisPath: "deterministic" },
  modelStatus: "deterministic",
};

const MINIMAL_ARTIFACT = {
  id: "insight:watchtower:HDFCBANK:minimal-2026-10-07",
  feature: "watchtower",
  subject: "HDFCBANK",
  generatedAt: "2026-10-07T09:30:00.000Z",
  observationWindow: { from: "2026-10-07T04:00:00.000Z", to: "2026-10-07T09:30:00.000Z" },
  status: "unknown",
  confidence: "low",
  materiality: "low",
  summary: "Nothing observed in this window.",
  whyItMatters: "The unknown stays unknown — the surface says so plainly.",
  whatChanged: [],
  invalidators: [],
  excludedVerdicts: [
    { reason: "below-threshold", count: 12 },
    { reason: "insufficient-history", count: 7 },
    { reason: "seed-derived", count: 3 },
  ],
  evidence: [],
  contradictions: [],
  uncertainty: [],
  nextInvestigations: [],
  provenance: { synthesisPath: "deterministic" },
  modelStatus: "deterministic",
};

/** Serve a fixture artifact through the route's REAL response shape. */
async function serveFixture(page: import("@playwright/test").Page, fixture: unknown) {
  await page.route("**/api/intelligence*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, capability: "thesis", subject: "FIXTURE", insight: fixture }),
    });
  });
}

const PROSE = {
  summary: "The price moved during the window; both sources agree.",
  why: "An agreed price move is the baseline every downstream judgement starts from.",
  delta: "3100.0 inr",
  field: "price",
};

/** The computed-style contract shared by the ready-state surfaces. */
async function assertSharedSurfaceContract(
  page: import("@playwright/test").Page,
  scope: string,
) {
  // 1. No default bullets anywhere in the composition (the screenshot
  //    defect: the badge UL rendered browser-default discs).
  for (const sel of [
    `${scope} .insight-surface__badges`,
    `${scope} .insight-surface__list`,
    `${scope} .insight-surface__facts`,
    `${scope} .insight-surface__what-changed`,
  ]) {
    const listStyle = await page.locator(sel).first().evaluate((el) => getComputedStyle(el).listStyleType);
    expect(listStyle, `${sel} must not render default bullets`).toBe("none");
  }

  // 2. Grouped badges: the row is a wrapping flex group with real gaps.
  const badgeStyles = await page.locator(`${scope} .insight-surface__badges`).first().evaluate((el) => {
    const c = getComputedStyle(el);
    return { display: c.display, gap: c.gap };
  });
  expect(badgeStyles.display).toBe("flex");
  expect(parseFloat(badgeStyles.gap)).toBeGreaterThan(0);

  // 3. Deliberate hierarchy: small-caps mono section titles; sectioned
  //    bodies (measurable left borders).
  const titleStyles = await page.locator(`${scope} .insight-surface__title`).first().evaluate((el) => {
    const c = getComputedStyle(el);
    return { fontSize: parseFloat(c.fontSize), transform: c.textTransform, mono: c.fontFamily.includes("Mono") };
  });
  expect(titleStyles.fontSize).toBeLessThanOrEqual(12);
  expect(titleStyles.transform).toBe("uppercase");
  expect(titleStyles.mono).toBe(true);
  const sectionBorder = await page.locator(`${scope} section.insight-surface`).first().evaluate((el) =>
    parseFloat(getComputedStyle(el).borderLeftWidth),
  );
  expect(sectionBorder).toBeGreaterThan(0);

  // 4. Visible summary / whyItMatters / whatChanged (positive controls:
  //    the fixture's own prose must be present, verbatim, and rendered).
  await expect(page.locator(`${scope} [data-insight-summary]`)).toContainText(PROSE.summary);
  await expect(page.locator(`${scope} [data-insight-why-it-matters]`)).toContainText(PROSE.why);
  await expect(page.locator(`${scope} [data-insight-what-changed-field="${PROSE.field}"]`)).toContainText(PROSE.delta);

  // 5. Honest state disclosure: the provenance line says deterministic
  //    (never an AI label on deterministic prose).
  await expect(page.locator(`${scope} .insight-surface__provenance`)).toContainText("deterministic");
  await expect(page.locator(`${scope} .insight-surface__provenance`)).not.toContainText("AI");

  // 6. No invented facts or advice anywhere in the composition.
  const text = await page.locator(scope).first().textContent();
  expect(text).not.toMatch(/\b(BUY|SELL|HOLD)\b/);
}

test.describe("A8 shared surface — dashboard brief (C1)", () => {
  test("composition renders styled, grouped, hierarchical, with visible artifact prose", async ({ page }) => {
    await serveFixture(page, DETERMINISTIC_ARTIFACT);
    await page.goto("/");
    // First-visit disclaimer modal (pre-existing app surface).
    const accept = page.getByRole("button", { name: /I UNDERSTAND/i });
    try { await accept.click({ timeout: 4000 }); } catch { /* already accepted */ }
    const brief = page.locator("[data-dashboard-brief]");
    await expect(brief).toBeVisible({ timeout: 20000 });
    await expect(brief).toHaveAttribute("data-dashboard-brief", "ready", { timeout: 15000 });
    await assertSharedSurfaceContract(page, "[data-dashboard-brief]");
  });
});

test.describe("A8 shared surface — stock panel (B1)", () => {
  test("composition renders styled, grouped, hierarchical, with visible artifact prose", async ({ page }) => {
    await serveFixture(page, DETERMINISTIC_ARTIFACT);
    await page.goto("/stock/BANKBARODA");
    const panel = page.locator("[data-intelligence-panel]");
    await expect(panel).toBeVisible({ timeout: 20000 });
    await expect(panel).toHaveAttribute("data-intelligence-panel", "ready", { timeout: 15000 });
    await assertSharedSurfaceContract(page, "[data-intelligence-panel]");
  });
});

test.describe("A8 shared surface — screener drawer (D2)", () => {
  test("composition renders styled, grouped, with the honest empty-evidence state", async ({ page }) => {
    // The MINIMAL fixture: unknown / low / low / deterministic — no
    // evidence rows, but the A4 excluded-verdict breakdown proves
    // observations occurred and none qualified.
    await serveFixture(page, MINIMAL_ARTIFACT);
    await page.goto("/stocks");
    const accept = page.getByRole("button", { name: /I UNDERSTAND/i });
    try { await accept.click({ timeout: 4000 }); } catch { /* already accepted */ }
    const badge = page.locator("[data-intelligence-badge]").first();
    await badge.scrollIntoViewIfNeeded();
    await badge.click();
    const drawer = page.locator('[role="dialog"][data-intelligence-drawer]');
    await expect(drawer).toBeVisible({ timeout: 10000 });
    await expect(drawer).toHaveAttribute("data-intelligence-drawer", "ready", { timeout: 15000 });

    // No default bullets on the lists the MINIMAL state renders (the
    // screenshot defect: the badge UL rendered browser-default discs;
    // evidence/uncertainty are empty here so their lists do not mount —
    // the excluded-verdict breakdown list carries the same contract).
    for (const sel of [
      '[role="dialog"] .insight-surface__badges',
      '[role="dialog"] .insight-surface__excluded',
    ]) {
      const listStyle = await page.locator(sel).first().evaluate((el) => getComputedStyle(el).listStyleType);
      expect(listStyle, `${sel} must not render default bullets`).toBe("none");
    }

    // Grouped badges.
    const badgeRow = await page.locator('[role="dialog"] .insight-surface__badges').evaluate((el) => {
      const c = getComputedStyle(el);
      return { display: c.display, gap: c.gap };
    });
    expect(badgeRow.display).toBe("flex");
    expect(parseFloat(badgeRow.gap)).toBeGreaterThan(0);

    // The honest unknown/low/no-model states, unchanged.
    await expect(page.locator('[role="dialog"] [data-insight-badge="status"]')).toHaveText("unknown");
    await expect(page.locator('[role="dialog"] [data-insight-badge="confidence"]')).toHaveText("low");
    await expect(page.locator('[role="dialog"] [data-insight-badge="modelStatus"]')).toHaveText("deterministic");
    await expect(page.locator('[role="dialog"] .insight-surface__provenance')).toContainText("no model involved");

    // The empty-evidence wording: observations occurred, none qualified.
    await expect(page.locator('[role="dialog"] .insight-surface--evidence')).toContainText(
      "No observations qualified as material evidence in the observation window.",
    );

    // The A4 excluded-verdict breakdown (data attributes, never parsed
    // UI text): counts by reason are present.
    await expect(page.locator("[data-insight-excluded-verdicts]")).toBeVisible();
    await expect(page.locator('[data-insight-excluded-reason="below-threshold"]')).toBeVisible();
    await expect(page.locator('[data-insight-excluded-reason="below-threshold"]')).toContainText("12");

    // The artifact's own prose is visible (positive control).
    await expect(page.locator('[role="dialog"] [data-insight-summary]')).toContainText("Nothing observed in this window.");
    await expect(page.locator('[role="dialog"] [data-insight-why-it-matters]')).toContainText("The unknown stays unknown");

    // No invented facts or advice.
    const text = await drawer.textContent();
    expect(text).not.toMatch(/\b(BUY|SELL|HOLD)\b/);
  });
});
