import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// E6-08 — accessibility gate (WCAG 2.2 AA), roadmap Phase 6.
//
// Contract: the core user surfaces must scan CLEAN under axe-core for the
// WCAG 2.0/2.1/2.2 A+AA rule sets (tags below). A violation is a defect:
// it must be FIXED, never waived into the baseline. If a rule ever fires
// on a third-party surface we cannot control, the exclusion must be
// per-route, named, and reasoned here — never a global pass.
//
// Rule 24 evidence (fail-first): on the pre-fix tree this suite found
// violations on every scanned route (raw output in
// docs/evidence/round14/e6-08-axe-failfirst.txt) — the gate had real bite
// before the fixes landed.
//
// Scope note (rule 16 honesty): axe-core automates ~30-40% of WCAG — this
// gate pins the automatable subset. Manual obligations (keyboard traps in
// complex widgets, meaningful alt text quality, reading order judgement)
// remain audit items, not claims this test can make.

const WCAG_AA_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

// The core surfaces a real user hits. Routes that 307/401 on purpose
// (e.g. /alerts) are scanned at their final destination by the browser
// automatically; nothing is skipped for convenience.
const ROUTES: Array<[string, string]> = [
  ["/", "homepage"],
  ["/screener", "screener"],
  ["/stock/RELIANCE", "stock page"],
  ["/methodology", "methodology"],
  ["/lab", "portfolio lab"],
  ["/rishis", "rishis roster"],
];

for (const [route, label] of ROUTES) {
  test(`axe: ${route} (${label}) is free of WCAG 2.2 AA violations`, async ({
    page,
  }) => {
    // networkidle never settles on routes with long-polling price hooks —
    // wait for load, then a settle beat for hydration.
    await page.goto(route, { waitUntil: "load", timeout: 45_000 });
    await page.waitForTimeout(1_200);
    const results = await new AxeBuilder({ page })
      .withTags(WCAG_AA_TAGS)
      .analyze();

    const violations = results.violations;
    const summary = violations
      .map(
        (v) =>
          `${v.id} [${v.impact ?? "none"}] x${v.nodes.length} — ${v.help}` +
          `\n      e.g. ${v.nodes[0]?.target.join(" ") ?? "(no target)"}`,
      )
      .join("\n    ");

    expect(
      violations,
      `axe found ${violations.length} violation kinds on ${route}:\n    ${summary}`,
    ).toEqual([]);
  });
}
