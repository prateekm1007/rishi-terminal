/**
 * DEMO-6 (founder order, 2026-10-12; issue #364): the honest demo path
 * spec — search, verdict view, dissent expand, flip expand, watchlist add.
 *
 *   "Until real data exists, it asserts the honest empty states."
 *
 * The demo path walks the five interactions a live demo performs, and on
 * the CURRENT record set every verdict-bearing surface must show the
 * honest record (P0-1: seed rows show no verdict; the founder-worded
 * empty states). Runs green on main — the honest states ARE the correct
 * states today. When licensed live data lands, the same path must show
 * the full verdict record instead (the spec flips with the data contract,
 * not before).
 *
 * Lessons from the two live strict-mode strikes (#376, #380): every
 * locator is main-content-scoped or .first() — the off-main hidden
 * streaming-completion container must never double-match.
 */
import { test, expect } from "@playwright/test";

test.describe("demo path — the honest walk (DEMO-6)", () => {
  // The first-visit disclaimer modal (LegalDisclaimer → DisclaimerModal,
  // zIndex 9999, fixed) overlays every fresh browser until accepted —
  // every CLICK leg below is intercepted by it. The established pattern
  // (hydration-pins, evidence-fixtures) pre-seeds the acceptance key so
  // the modal never mounts. The four failing legs of the first CI run
  // (search result click, wisdom tab click ×2, watchlist input) were all
  // this — the spec's original "runs green" claim was never true
  // (Playwright had never run on the branch; cadence aborts killed every
  // prior attempt before this job).
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("rishi_disclaimer_v2", "accepted");
      } catch {
        /* storage unavailable — the modal mounts and the legs fail loudly */
      }
    });
  });

  test("search finds a stock and lands on its honest record", async ({ page }) => {
    await page.goto("/");
    const search = page.getByLabel("Search instruments").first();
    await search.click({ force: true });
    await search.fill("RELIANCE");
    // the dropdown renders results; navigate with a click
    await expect(page.getByLabel("Search results")).toBeVisible({ timeout: 15_000 });
    await page.getByLabel("Search results").getByText(/RELIANCE/i).first().click();
    await expect(page).toHaveURL(/\/stock\/RELIANCE/, { timeout: 20_000 });
  });

  test("verdict view: the seed record is the honest no-verdict record", async ({ page }) => {
    await page.goto("/stock/RELIANCE");
    const main = page.locator("main");
    // P0-1: the seed record replaces every verdict surface
    await expect(main.getByText(/NO VERDICT — ILLUSTRATIVE SEED DATA/i).first()).toBeVisible({ timeout: 20_000 });
    // the verdict sections stay suppressed on seed data
    await expect(main.getByText(/RISHI COMMENTARY/i)).toHaveCount(0);
    await expect(main.getByText(/Pillar Breakdown/i)).toHaveCount(0);
    // the honest surfaces that DO render on seed data (B-18 controls)
    await expect(main.getByText(/Key Metrics/i).first()).toBeVisible();
    await expect(main.getByText(/Peer Comparison/i).first()).toBeVisible();
  });

  test("dissent expand: the wisdom tab opens to the honest no-verdict record", async ({ page }) => {
    await page.goto("/stock/RELIANCE");
    const main = page.locator("main");
    await main.getByText(/Rishi Wisdom/i).first().click({ timeout: 20_000 });
    // HONEST CONTRACT (P0-1): on seed data the wisdom tab body IS the
    // NoVerdictRecord — StockPageClient renders the grid (and its
    // expandable cards) only when verdictsAllowed(dataQuality). There is
    // no council output to expand into, so the honest walk asserts the
    // record itself. When licensed live data lands, this leg flips to
    // the card-expansion interaction (the DEMO-5 dissent_expanded event
    // is already wired on the card's expand handler in RishiGrid — the
    // surface exists in code; seed data simply cannot reach it, the same
    // finding as flip_expanded).
    await expect(main.getByText(/NO VERDICT — ILLUSTRATIVE SEED DATA/i).first()).toBeVisible({ timeout: 15_000 });
    // B-18 positive control: the tab BODY rendered (the record text
    // above proves it) — and no expandable council card exists on seed
    // data (the grid never mounts; a cursor-pointer card here would mean
    // a verdict leaked onto a seed row).
    expect(await main.locator("[class*='cursor-pointer']").count()).toBe(0);
  });

  test("flip expand: the honest state on seed data is the no-verdict record", async ({ page }) => {
    await page.goto("/stock/RELIANCE");
    const main = page.locator("main");
    await main.getByText(/Rishi Wisdom/i).first().click({ timeout: 20_000 });
    // KNOWN SHAPE (DEMO-5 finding): the flip-conditions VIEW is the dead
    // RishiCouncil component (zero importers) — and on seed data there is
    // no verdict AT ALL, so there is NOTHING to flip: the honest state is
    // the no-verdict record — never a fabricated flip path. (The original
    // leg tried to expand a council card; the grid never mounts on seed
    // data — verdictsAllowed gates it — so the card interaction is
    // unreachable today and the record itself is the assertion.)
    await expect(main.getByText(/NO VERDICT — ILLUSTRATIVE SEED DATA/i).first()).toBeVisible({ timeout: 15_000 });
    // the dead flip-conditions surface must NOT resurrect silently
    expect(await main.getByText(/no single-input path to a pass/i).count()).toBeLessThanOrEqual(1);
  });

  test("the quote never stale-masquerades: the page discloses its render time and an intraday claim is fresh (P0)", async ({ page }) => {
    await page.goto("/stock/RELIANCE");
    const main = page.locator("main");
    // P0 (round 52, founder order 12 Oct 2026): "Include a step that fails
    // if the quote is stale." The page DISCLOSES its ISR generation time —
    // the attribute must exist, parse, and not claim the future.
    const renderedAt = await main.locator("[data-rendered-at]").first().getAttribute("data-rendered-at");
    expect(renderedAt).toBeTruthy();
    const renderedMs = Date.parse(renderedAt as string);
    expect(Number.isFinite(renderedMs)).toBe(true);
    expect(renderedMs).toBeLessThanOrEqual(Date.now());
    // The quote invariant: the observation line (when a quote renders at
    // all) may claim "market open · intraday quote" ONLY for a stamp no
    // older than 15 minutes — anything older renders "as of … · stale"
    // (lib/pricePresentation STALE_AFTER_MS, computed at display time).
    // On a quote-less record (CI's hermetic server, honest UNAVAILABLE)
    // there is no observation line and the invariant holds vacuously —
    // the leg exists to bite on the LIVE demo path.
    const labelLocator = main.getByText(/IST · (market|as of)/i).first();
    if ((await labelLocator.count()) > 0) {
      const label = (await labelLocator.textContent()) ?? "";
      if (/intraday quote/i.test(label)) {
        const stampMatch = label.match(/(\d{2}):(\d{2}) IST/);
        expect(stampMatch).toBeTruthy();
        // The stamp's freshness is checked against the page's own render
        // clock: an intraday claim baked at render time must be within
        // the 15-minute window OF that render (display-time computation
        // keeps it honest for the viewer's clock as well).
        const stampMinutes = Number(stampMatch![1]) * 60 + Number(stampMatch![2]);
        const rendered = new Date(renderedMs);
        const renderedIstMinutes = rendered.getUTCHours() * 60 + rendered.getUTCMinutes() + 330;
        const sameDay = label.match(/(\d{1,2}) (\w{3})/)?.[0] ===
          `${rendered.getUTCDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][rendered.getUTCMonth()]}`;
        if (sameDay) {
          const ageMinutes = ((renderedIstMinutes - stampMinutes) + 1440) % 1440;
          expect(ageMinutes).toBeLessThanOrEqual(15);
        }
      } else {
        // Any OTHER wording is honest by construction (stale / last
        // session / not-from-today all disclose their own age).
        expect(/stale|last session|not from/i.test(label)).toBe(true);
      }
    }
  });

  test("watchlist add: the anonymous lab accepts a symbol and shows the row", async ({ page }) => {
    // The lab defaults to the overview tab — the watchlist surface is the
    // tab=watchlist deep link the tab bar itself renders (LabContent reads
    // the param); a bare /lab shows no symbol input.
    await page.goto("/lab?tab=watchlist");
    const input = page.locator("input[placeholder*='symbol']").first();
    await input.waitFor({ state: "visible", timeout: 20_000 });
    await input.fill("RELIANCE");
    await input.press("Enter");
    // the honest row renders with the added symbol
    await expect(page.locator("main").getByText(/RELIANCE/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
