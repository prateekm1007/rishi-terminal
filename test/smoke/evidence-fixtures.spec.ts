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

    // honest empty states (2026-10-10 repair: the empty-evidence state
    // says no observations QUALIFIED — the minimal fixture's excluded
    // breakdown proves observations occurred; the whatChanged prose
    // and the A1 summary/whyItMatters render verbatim).
    expect(html).toContain("No stated uncertainties");
    expect(html).toContain("No observations qualified as material evidence in the observation window.");
    expect(html).toContain("No field-level changes recorded");
    expect(html).toContain("What changed");
    expect(html).toContain("Why it matters");
    expect(html).toContain("Field-level changes");
    expect(html).toContain("Nothing observed in this window.");
    expect(html).toContain('data-insight-excluded-reason="below-threshold"');

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
});
