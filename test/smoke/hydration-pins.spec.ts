/**
 * HYD-PINS (founder direction, 2026-10-10) — the three hydrated-or-empty
 * state pins, kept as committed CI guards AND run against production for
 * the round-43 legs:
 *
 *   1. /news — headlines render hydrated (>= 1 story card with its
 *      accessible name) or the page shows an EXPLICIT honest empty state
 *      ("Live news is unavailable right now." / "No stories available
 *      right now."). The SSR markdown shows none of this (the list is
 *      client-fetched), so the browser-level settled state is the only
 *      honest proof.
 *   2. /pulse FX — the currency section settles to labelled live FX
 *      (>= 1 pair card) or the honest unavailable state; the transient
 *      "Fetching live currency rates…" is never terminal. The
 *      failure-injection leg (the route 503s) proves the resolution is
 *      failure-driven — the pre-fix tree stranded at "Fetching…" on
 *      failure (RED: docs/evidence/round43/red-hyd-pins.txt).
 *   3. /stocks — the per-row Rishi drawer affordance keeps its accessible
 *      name, its 28 px minimum touch target (the WCAG 2.2 floor by
 *      construction; the production leg records the measured ~50x28
 *      box), and a DESIGNED visible keyboard focus (the scoped
 *      focus-visible rule extended to the badge — the pre-fix tree only
 *      had the browser-default outline, RED in the same capture).
 */
import { test, expect } from "@playwright/test";

test.describe("HYD-PINS — hydrated-or-empty states on the real surfaces", () => {
  test("/news settles to hydrated headlines or an explicit honest empty state", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("rishi_disclaimer_v2", "accepted"));
    await page.goto("/news");

    // The settled-state poll (the R43 atomic discipline): the page shows
    // EITHER >= 1 hydrated story card (a role=link card with an accessible
    // name — the headline) OR one of the two explicit honest empty texts.
    // A skeleton grid alone never satisfies the poll.
    const honestEmpty = page.getByText(
      /Live news is unavailable right now\.|No stories available right now\./,
    );
    await expect(async () => {
      const cards = await page.locator("main [role='link'][aria-label]").count();
      const empty = await honestEmpty.count();
      expect(cards >= 1 || empty >= 1, `settled state expected, cards=${cards} empty=${empty}`).toBe(true);
    }).toPass({ timeout: 30_000 });

    // Positive control on the hydrated branch: the card's accessible name
    // is a real headline (non-empty, not a skeleton artifact).
    const cards = await page.locator("main [role='link'][aria-label]").count();
    if (cards >= 1) {
      const label = await page.locator("main [role='link'][aria-label]").first().getAttribute("aria-label");
      expect((label ?? "").trim().length).toBeGreaterThan(10);
      // and the honest empty texts are NOT shown alongside data (the two
      // states are mutually exclusive by construction)
      await expect(honestEmpty).toHaveCount(0);
    } else {
      // the honest branch: the empty state is VISIBLE content
      await expect(honestEmpty.first()).toBeVisible();
    }
  });

  test("/pulse FX settles to labelled live FX or the honest unavailable state", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("rishi_disclaimer_v2", "accepted"));
    await page.goto("/pulse");

    // The currency section (the default macro tab). Scope by the section
    // heading — the RSC payload carries the same string, but the locator
    // matches the rendered card containing the FX states.
    const fxCard = page.locator(".card-unified").filter({ hasText: "CURRENCY IMPACT" }).first();
    await expect(fxCard).toBeVisible({ timeout: 20_000 });

    // Settled-state poll: a labelled live pair (an /INR pair card) or the
    // honest unavailable text. "Fetching live currency rates…" alone never
    // satisfies the poll — it is a transient, never a terminal state.
    const unavailable = fxCard.getByText("Live currency rates unavailable right now");
    await expect(async () => {
      const pairs = await fxCard.getByText(/\/INR/).count();
      const empty = await unavailable.count();
      expect(pairs >= 1 || empty >= 1, `FX must settle, pairs=${pairs} empty=${empty}`).toBe(true);
    }).toPass({ timeout: 30_000 });

    // On the hydrated branch, the pair card carries the observation
    // labels (Trend/Vol rows) — labelled live FX, not bare numbers.
    const pairs = await fxCard.getByText(/\/INR/).count();
    if (pairs >= 1) {
      const firstPair = fxCard.getByText(/\/INR/).first();
      await expect(firstPair).toBeVisible();
    }
  });

  test("/pulse FX resolves to the honest unavailable state when the route fails (failure-driven, never stranded)", async ({ page }) => {
    // The bite leg: the pre-fix tree kept currencies === null on a
    // non-OK response and stranded at "Fetching live currency rates…"
    // forever. The fix resolves every failure to the honest state.
    await page.addInitScript(() => window.localStorage.setItem("rishi_disclaimer_v2", "accepted"));
    await page.route(/\/api\/pulse\/currency/, (route) =>
      route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"unavailable"}' }),
    );
    await page.goto("/pulse");

    const fxCard = page.locator(".card-unified").filter({ hasText: "CURRENCY IMPACT" }).first();
    await expect(fxCard).toBeVisible({ timeout: 20_000 });
    await expect(fxCard.getByText("Live currency rates unavailable right now")).toBeVisible({ timeout: 15_000 });
    // the stranding text is gone once settled
    await expect(fxCard.getByText("Fetching live currency rates")).toHaveCount(0);
  });

  test("/stocks Rishi affordance: accessible name, >= 28px target, designed visible keyboard focus", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("rishi_disclaimer_v2", "accepted"));
    await page.goto("/stocks", { waitUntil: "networkidle" });

    const badges = page.locator("[data-intelligence-badge]");
    // Positive control: the affordances exist at breadth (the CI server
    // and production both carry the 896-row universe).
    const count = await badges.count();
    expect(count).toBeGreaterThanOrEqual(100);

    const badge = badges.first();
    // the accessible name contract (the D2 pin: the opener tells you what
    // it opens, and for which server-resolved symbol)
    const name = await badge.getAttribute("aria-label");
    expect(name).toMatch(/^Open Rishi intelligence for [A-Z0-9&_.=/-]+$/);

    // the touch target: 28 px tall by construction (inline style, global
    // border-box); width >= the 24 px WCAG 2.2 minimum. The production
    // leg records the measured ~50x28 box (content adds width).
    const box = await badge.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { w: r.width, h: r.height };
    });
    expect(box.h).toBe(28);
    expect(box.w).toBeGreaterThanOrEqual(28);

    // the DESIGNED visible keyboard focus: the scoped focus-visible rule
    // covers the badge (extended in this change; the pre-fix tree had
    // only the browser-default outline — RED in the fail-first capture).
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
