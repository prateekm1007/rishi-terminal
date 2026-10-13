import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// ENG-4 (founder round 55, adoption order verbatim: "dequelabs/axe-core +
// abhinaba-ghosh/axe-playwright (MPL-2.0 + MIT) — Accessibility gate on the
// demo path (ENG-4) — Don't modify axe's own files") — the a11y gate on the
// DEMO-PATH STATES.
//
// E6-08 (round 14, test/smoke/a11y-wcag.spec.ts) axe-scans the core surfaces
// at their DEFAULT render. The demo walks STATES those loads never render:
// the search dropdown open, the wisdom tab open (the honest no-verdict
// record on seed data), the watchlist with an added row. An investor sees
// those exact states on stage — this gate scans them.
//
// Contract (unchanged from E6-08): a violation is a defect — FIX it, never
// waive it. No exclusions here (the states render only first-party code).
// axe's own files are never modified (the founder's condition; the scan is
// read-only, AxeBuilder drives the page, not the library).
//
// Rule 24 bite, self-contained: the last leg injects a known WCAG-violating
// node (contrast 1.9:1 text) and asserts the SAME scan reports it — if axe
// ever stops discriminating on this build, this leg fails loudly, so the
// passing state legs cannot be theater. (E6-08's scratch-branch evidence —
// docs/evidence/round14/e6-08-axe-failfirst.txt — remains the historical
// bite proof that this site's real defects were caught.)
//
// Scope note (rule 16 honesty, carried from E6-08): axe-core automates
// ~30-40% of WCAG; manual obligations stay audit items.

const WCAG_AA_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function scan(page: import("@playwright/test").Page) {
  await page.waitForTimeout(1_200); // the hydration settle beat (E6-08 pattern)
  return new AxeBuilder({ page }).withTags(WCAG_AA_TAGS).analyze();
}

function assertClean(route: string, state: string, violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"]) {
  const summary = violations
    .map(
      (v) =>
        `${v.id} [${v.impact ?? "none"}] x${v.nodes.length} — ${v.help}` +
        `\n      e.g. ${v.nodes[0]?.target.join(" ") ?? "(no target)"}`,
    )
    .join("\n    ");
  expect(
    violations,
    `axe found ${violations.length} violation kinds on ${route} (${state}):\n    ${summary}`,
  ).toEqual([]);
}

test.describe("ENG-4 — axe on the demo-path states", () => {
  // The first-visit disclaimer modal overlays every fresh browser until
  // accepted (zIndex 9999, fixed) — the established DEMO-6 pre-seed pattern.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("rishi_disclaimer_v2", "accepted");
      } catch {
        /* storage unavailable — the modal mounts and the legs fail loudly */
      }
    });
  });

  test("axe: search results dropdown OPEN (the demo's first surface)", async ({ page }) => {
    await page.goto("/", { waitUntil: "load", timeout: 45_000 });
    const search = page.getByLabel("Search instruments").first();
    await search.click({ force: true });
    await search.fill("RELIANCE");
    await expect(page.getByLabel("Search results")).toBeVisible({ timeout: 15_000 });
    assertClean("/", "search dropdown open", (await scan(page)).violations);
  });

  test("axe: wisdom tab OPEN — the honest no-verdict record (the demo's dissent stop)", async ({ page }) => {
    await page.goto("/stock/RELIANCE", { waitUntil: "load", timeout: 45_000 });
    const main = page.locator("main");
    await main.getByText(/Rishi Wisdom/i).first().click({ timeout: 20_000 });
    // the demo lands on the honest record (P0-1); scan THAT state
    await expect(main.getByText(/NO VERDICT — ILLUSTRATIVE SEED DATA/i).first()).toBeVisible({ timeout: 15_000 });
    assertClean("/stock/RELIANCE", "wisdom tab open", (await scan(page)).violations);
  });

  test("axe: watchlist with an added row (the demo's lab stop)", async ({ page }) => {
    await page.goto("/lab?tab=watchlist", { waitUntil: "load", timeout: 45_000 });
    const input = page.locator("input[placeholder*='symbol']").first();
    await input.waitFor({ state: "visible", timeout: 20_000 });
    await input.fill("RELIANCE");
    await input.press("Enter");
    await expect(page.locator("main").getByText(/RELIANCE/i).first()).toBeVisible({ timeout: 10_000 });
    assertClean("/lab?tab=watchlist", "watchlist row added", (await scan(page)).violations);
  });

  test("axe: the gate BITES — an injected contrast violation is reported on this build (rule 24)", async ({ page }) => {
    await page.goto("/stocks", { waitUntil: "load", timeout: 45_000 });
    // Inject a known WCAG AA failure: ~1.9:1 text on white (fails 4.5:1).
    // This is a SELF-TEST leg — the node exists only in this browser
    // session and never reaches a user.
    await page.evaluate(() => {
      const el = document.createElement("div");
      el.setAttribute("data-eng4-selftest", "true");
      el.style.color = "#bbbbbb";
      el.style.background = "#ffffff";
      el.textContent = "ENG-4 self-test: this low-contrast text must be reported";
      document.body.appendChild(el);
    });
    const results = await scan(page);
    const ids = results.violations.map((v) => v.id);
    expect(
      ids,
      `the injected color-contrast violation was NOT reported — the demo-path a11y gate cannot bite (reported: ${JSON.stringify(ids)})`,
    ).toContain("color-contrast");
  });
});
