/**
 * INT-A8 — SSR-HTML positive controls for the non-indexed fixture
 * route (C10). Runs against `npm run start` in CI (the config's
 * webServer) and against SMOKE_BASE_URL for production verification.
 * Assertions are on the SSR HTML string (first byte — no hydration),
 * per the pre-registration: expected NEW strings present; absence
 * pins — no advice strings, no fetching states.
 */
import { test, expect } from "@playwright/test";

test.describe("evidence-fixtures route (A8)", () => {
  test("renders every closed state over the canned fixtures", async ({ request }) => {
    const res = await request.get("/evidence-fixtures");
    expect(res.status()).toBe(200);
    const html = await res.text();

    // one section per pre-registered fixture
    for (const name of [
      "conflictWithContradictions",
      "deterministicProvenance",
      "boundedModelProvenance",
      "emptyUncertainty",
      "minimal",
    ]) {
      expect(html).toContain(`data-fixture="${name}"`);
    }

    // contradiction banner: joined evidence texts, not bare ids
    expect(html).toContain("The two sources report different closing prices");
    expect(html).toContain("price = 1204.1 inr per source A");
    expect(html).toContain("price = 1210.1 inr per source B");

    // provenance disclosure mirrored
    expect(html).toContain("deterministic artifact, no model involved");
    expect(html).toContain("bounded-model synthesis");
    expect(html).toContain("openai");

    // honest empty states (INT-A8-PRES wording: exclusion by verdict, never absence)
    expect(html).toContain("No stated uncertainties");
    expect(html).toContain(
      "No observed transition qualified as material evidence in this window — the ledger records only material events.",
    );

    // INT-A8-PRES: the artifact's prose fields render verbatim under their labels
    expect(html).toContain("Summary");
    expect(html).toContain("The price moved during the window; both sources agree.");
    expect(html).toContain("Why it matters");
    expect(html).toContain("An agreed price move is the baseline every downstream judgement starts from.");
    expect(html).toContain("What changed");
    expect(html).toContain("price: 3100.0 inr -&gt; 3105.5 inr");

    // badges carry exact vocabulary words
    expect(html).toContain('data-insight-badge="status">conflict<');
  });

  test("absence pins: no advice strings, no fetching states, no refusal sections", async ({ request }) => {
    const res = await request.get("/evidence-fixtures");
    const html = await res.text();
    for (const banned of ["BUY", "SELL", "HOLD", "FETCHING", "Loading…", "data-fixture-refused"]) {
      expect(html).not.toContain(banned);
    }
  });

  test("the route is non-indexed: metadata robots + robots.txt disallow", async ({ request }) => {
    const res = await request.get("/evidence-fixtures");
    const html = await res.text();
    expect(html).toContain("noindex");
    const robots = await request.get("/robots.txt");
    const robotsText = await robots.text();
    expect(robotsText).toContain("Disallow: /evidence-fixtures");
  });

  // INT-D3 mount verification (founder direction, 2026-10-10): the Ask
  // Rishi affordance's READY-STATE mount proven on the sanctioned fixture
  // surface — the live stock page honestly renders it ABSENT pre-window
  // (the designed 404), so the mount contract is verified here: the ONE
  // deterministic change key (the A7 derivation) over the parsed fixture
  // anchors the affordance; asking posts to the ONE /api/chat; a fixture
  // key resolves no artifact, so the honest terminal state is the
  // route's refusal rendered verbatim (CI: "Chat unavailable" — no
  // pepper; production: "Insight not available") — NEVER an answer, and
  // never seed data standing in for a live artifact.
  test("the D3 affordance mount: idle contract, honest refusal, never answered", async ({ page }) => {
    // the disclaimer is localStorage-gated (LegalDisclaimer reads
    // 'rishi_disclaimer_v2'); pre-seeding it means the modal never mounts
    // and cannot intercept the submit click (the same harness rule the
    // a8-presentation spec carries since the R42 disclaimer-race fix).
    await page.addInitScript(() => window.localStorage.setItem("rishi_disclaimer_v2", "accepted"));
    await page.goto("/evidence-fixtures");
    const mount = page.locator("section[data-fixture-ask-rishi]");
    await expect(mount).toHaveCount(1, { timeout: 15_000 });

    const ask = mount.locator("[data-ask-rishi]");
    await expect(ask).toHaveCount(1);
    await expect(ask).toHaveAttribute("data-ask-rishi", "idle");

    // the accessible contract: the labelled composer (the textarea's
    // accessible name comes from its label element)
    await expect(mount.locator("#ask-rishi-input")).toHaveAccessibleName("Ask Rishi about this insight");

    // the honesty caption: names the fixture key and the expected refusal
    await expect(mount).toContainText("fixture");
    await expect(mount).toContainText("will refuse");

    // empty input disables the submit (nothing sent)
    const submit = mount.getByRole("button", { name: "Ask" });
    await expect(submit).toBeDisabled();

    // an ask lands in an honest terminal state — refused (the route's
    // error verbatim in the role=alert) or unavailable. NEVER "answered":
    // a fixture key must never produce content on any environment.
    await mount.locator("#ask-rishi-input").fill("What changed in this fixture?");
    await submit.click();
    let terminal = "";
    await expect(async () => {
      terminal = (await ask.getAttribute("data-ask-rishi")) ?? "";
      expect(["refused", "unavailable"]).toContain(terminal);
    }).toPass({ timeout: 20_000 });
    expect(terminal).not.toBe("answered");
    if (terminal === "refused") {
      const refusal = mount.locator("[data-ask-rishi-refusal]");
      await expect(refusal).toBeVisible();
      expect((await refusal.textContent()) ?? "").not.toBe("");
    }
  });
});
