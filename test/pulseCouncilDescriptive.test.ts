/**
 * /pulse — the council readout is DESCRIPTIVE, never prescriptive
 * (founder direction 2026-10-10, direction 4).
 *
 * The investigation-not-advice contract: "What the Council Recommends"
 * renders what the council's stances SAY (a regime readout), never
 * positioning instructions to the user. The live defect: the mixed-regime
 * branch rendered "Stay barbell … Keep cash for volatility" — imperative
 * positioning language — and the other two branches carried the same
 * vocabulary ("Avoid leverage", "Prefer quality compounders", "size
 * positions conservatively").
 *
 * Fail-first: on the pre-fix tree the banned-vocabulary scan FAILS (the
 * advice strings are in the source); after the reword it passes and the
 * descriptive framing is pinned present — one assertion per branch, so
 * every deterministic-per-date branch is covered, not just the one that
 * happened to render today.
 *
 * The May/Jun-2026 as-of staleness labels are OUT OF SCOPE here: they
 * stay honestly labeled as static reference (freshness is a pipeline
 * gap to schedule, never to fake).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PAGE = readFileSync(join(ROOT, "app", "pulse", "page.tsx"), "utf8");

/** The councilReco source region — the three deterministic branches. */
function councilRecoSource(): string {
  const start = PAGE.indexOf("const councilReco =");
  expect(start).toBeGreaterThan(-1);
  const end = PAGE.indexOf("const tabs:", start);
  expect(end).toBeGreaterThan(start);
  return PAGE.slice(start, end);
}

describe("pulse council readout — descriptive, never prescriptive", () => {
  it("carries no advice vocabulary in any branch", () => {
    const src = councilRecoSource();
    // the closed banned list: every imperative/positioning phrase the
    // readout must never carry (each was live in the pre-fix tree)
    for (const banned of [
      "Stay barbell",
      "Keep cash",
      "Avoid leverage",
      "size positions",
      "Prefer quality",
      "prioritize",
      "size your",
      "you should",
      "consider buying",
      "book profits",
      "add exposure",
    ]) {
      expect(src).not.toContain(banned);
    }
  });

  it("states each branch as a readout of the council's stances", () => {
    const src = councilRecoSource();
    // the descriptive framing is pinned per branch: the readout reports
    // what the stances say, never what the user should do
    expect(src).toContain("stances diverge widely");
    expect(src).toContain("most stances screen constructive");
    expect(src).toContain("the stances split between quality defensives and selective cyclicals");
  });
});
