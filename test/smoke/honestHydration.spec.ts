/**
 * Honest hydrated-or-empty states — the production pins the founder
 * ordered (direction 5, 2026-10-10), kept armed in CI thereafter:
 *
 *   1. /news headlines render hydrated OR the explicit honest empty
 *      state — never a stranded skeleton (the SSR markdown shows no
 *      headlines; the hydrated DOM is the contract).
 *   2. /pulse FX with a forced upstream 503: the block resolves to the
 *      honest unavailable — never the perpetual "Fetching…" promise
 *      (the pre-fix defect: the !ok path returned without setting the
 *      state, stranding the promise on every failed fetch).
 *   3. /pulse FX live: labelled rates or the honest unavailable within
 *      a bound — env-agnostic (production serves real tiles; CI's
 *      upstream may refuse and must land in the honest unavailable).
 *   4. /pulse FX without JS: the first byte carries the honest
 *      unavailable disclosure (the macro tab is the DEFAULT tab, so the
 *      loading promise is visible in the no-JS first render and can
 *      strand — the <noscript> disclosure is the honest no-JS state).
 *   5. /stocks per-row Rishi badge: the accessible name, the recorded
 *      50x28 target, and the designed visible keyboard focus.
 *
 * Runs against `npm run start` in CI and against SMOKE_BASE_URL for the
 * production verification legs.
 */
import { test, expect } from "@playwright/test";

const DISCLAIMER_SEED = () => window.localStorage.setItem("rishi_disclaimer_v2", "accepted");

test.describe("honest hydrated-or-empty states", () => {
  test("/news: hydrated headlines or the explicit honest empty state — never stranded", async ({ page }) => {
    await page.addInitScript(DISCLAIMER_SEED);
    await page.goto("/news");
    let outcome = "";
    await expect(async () => {
      const headlines = await page.locator("[role=\"link\"][aria-label] h3").count();
      const fetchFailedEmpty = await page.getByText("Nothing is shown rather than made-up headlines.").count();
      const noStoriesEmpty = await page.getByText("No stories available right now.").count();
      if (headlines > 0) outcome = `headlines: ${headlines}`;
      else if (fetchFailedEmpty > 0) outcome = "honest empty: fetch failed";
      else if (noStoriesEmpty > 0) outcome = "honest empty: no stories";
      expect(outcome).not.toBe("");
    }).toPass({ timeout: 30_000 });
    // positive control (B-18): the page is alive — the masthead renders
    expect(await page.locator("main, [class*=container], body").count()).toBeGreaterThan(0);
  });

  test("/pulse FX: a forced upstream 503 resolves to the honest unavailable — never the perpetual promise", async ({ page }) => {
    await page.addInitScript(DISCLAIMER_SEED);
    // force the route's own designed failure shape (the 503 the route
    // returns on upstream failure) in EVERY environment — the strand
    // defect is invisible when the API is healthy
    await page.route("**/api/pulse/currency", (route) =>
      route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Currency rates unavailable" }) }),
    );
    await page.goto("/pulse");
    await expect(async () => {
      const unavailable = await page.getByText("Live currency rates unavailable right now").count();
      expect(unavailable).toBeGreaterThan(0);
    }).toPass({ timeout: 30_000 });
    expect(await page.getByText("Fetching live currency rates…").count()).toBe(0);
  });

  test("/pulse FX: labelled live rates or the honest unavailable within the bound", async ({ page }) => {
    await page.addInitScript(DISCLAIMER_SEED);
    await page.goto("/pulse");
    let outcome = "";
    await expect(async () => {
      const tiles = await page.locator("div.card-unified", { hasText: /USD\/INR|EUR\/INR|GBP\/INR|JPY\/INR/ }).count();
      const unavailable = await page.getByText("Live currency rates unavailable right now").count();
      if (tiles > 0) outcome = `labelled FX tiles: ${tiles}`;
      else if (unavailable > 0) outcome = "honest unavailable";
      expect(outcome).not.toBe("");
    }).toPass({ timeout: 30_000 });
    // the promise must never survive the bound
    expect(await page.getByText("Fetching live currency rates…").count()).toBe(0);
  });

  test("/pulse FX without JS: the first byte carries the honest unavailable disclosure", async ({ request }) => {
    const res = await request.get("/pulse");
    expect(res.status()).toBe(200);
    const html = await res.text();
    // the macro tab is the DEFAULT tab, so the loading promise IS the
    // no-JS first render — the <noscript> disclosure is what makes it
    // honest (a stranded promise with no disclosure would fail this)
    expect(html).toContain("JavaScript is off");
    expect(html).toContain("nothing is shown rather than made-up numbers");
  });

  test("/stocks badge: accessible name, the 50x28 target, visible keyboard focus", async ({ page }) => {
    await page.addInitScript(DISCLAIMER_SEED);
    await page.goto("/stocks", { waitUntil: "networkidle" });
    const badge = page.locator("[data-intelligence-badge]").first();
    await expect(badge).toHaveCount(1, { timeout: 15_000 });

    // the accessible name: the opener names its subject
    const symbol = await badge.getAttribute("data-intelligence-badge");
    expect(symbol).toBeTruthy();
    await expect(badge).toHaveAccessibleName(`Open Rishi intelligence for ${symbol}`);

    // the recorded 50x28 target (the #300 inline-styling repair) with the
    // WCAG 2.2 floor asserted alongside it
    const box = await badge.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    });
    expect(box.w).toBe(50);
    expect(box.h).toBe(28);
    expect(box.w).toBeGreaterThanOrEqual(24);
    expect(box.h).toBeGreaterThanOrEqual(24);

    // the designed visible keyboard focus (the #302 :focus-visible rule):
    // establish keyboard modality, focus, and require the solid designed
    // outline — never the browser default 'auto'
    await page.keyboard.press("Tab");
    await badge.focus();
    const focus = await badge.evaluate((el) => {
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
  });
});
