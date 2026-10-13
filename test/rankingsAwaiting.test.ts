/**
 * Round 49 — FD-22 / DELIV-1: the flag-on-but-nothing-qualifies state must
 * be HONEST.
 *
 * Founder's words (2026-10-12, DELIV-1): "Set RANKINGS_ENABLED=true in
 * production. Verify the three widgets show honest empty states, and that
 * no seed ranking renders."
 *
 * Defect (observed on the local flag-on render, 2026-10-11): with the flag
 * ON and every consensus refused by the price-licence gate (PR #349),
 * pickStockOfTheDay() returns null and DashboardTail falls into the
 * RankingsDisabledPanel whose note claims the widgets "are switched off" —
 * a false statement (the flag is on; there is simply nothing to rank).
 * C1: the UI never states what it has not verified.
 *
 * What this pin enforces:
 *   1. DashboardTail distinguishes the two states: the "switched off" note
 *      renders ONLY when the flag is off; the flag-on-no-candidates state
 *      renders the "rankingsAwaiting" keys instead.
 *   2. The awaiting note carries the honesty markers: the licence is the
 *      stated reason, and it says no seed-derived ranking is shown.
 *   3. Both key pairs exist in every locale catalog (i18n parity).
 *   4. Positive controls (B-18): the flag-off keys stay intact, and the
 *      awaiting keys are used by the awaiting branch only.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(p, "utf8");

const tail = read("components/dashboard/DashboardTail.tsx");

describe("FD-22 — the flag-on-nothing-qualifies state is honest (round 49)", () => {
  it("DashboardTail renders the awaiting keys when the flag is on but nothing qualifies", () => {
    // the awaiting branch exists and uses the awaiting keys
    expect(tail).toContain('t("dashboard2.rankingsAwaiting")');
    expect(tail).toContain('t("dashboard2.rankingsAwaitingNote")');
    // positive control: the flag-off branch keeps the disabled keys
    expect(tail).toContain('t("dashboard2.rankingsDisabled")');
    expect(tail).toContain('t("dashboard2.rankingsDisabledNote")');
  });

  it("round 54 (#370 acceptance): the awaiting state SHOWS the two named sections", () => {
    // Founder order 2026-10-13: "When it's on, the awaiting state must
    // show 'Top Buy Signals' and 'Short Radar' with the honest empty
    // copy." The awaiting branch (not just the ranked branch) renders
    // both section headers, each followed by the honest panel.
    const awaiting = tail.slice(
      tail.indexOf(") : rankingsEnabled ? ("),
      tail.indexOf(") : (", tail.indexOf(") : rankingsEnabled ? (")),
    );
    expect(awaiting.length).toBeGreaterThan(0);
    expect(awaiting).toContain('t("dashboard2.sections.topBuySignals")');
    expect(awaiting).toContain('t("dashboard2.sections.shortRadar")');
    expect(awaiting).toContain('t("dashboard2.rankingsAwaiting")');
    expect(awaiting).toContain('t("dashboard2.rankingsAwaitingNote")');
    // the awaiting branch must NOT claim the widgets are switched off
    expect(awaiting).not.toContain("rankingsDisabled");
  });

  it("the switched-off note renders only in the flag-off branch (source structure)", () => {
    // the awaiting branch must be reachable WITHOUT the disabled note:
    // the ternary order is widgets ? ... : rankingsEnabled ? awaiting : disabled
    const ternary = tail.slice(tail.indexOf("{rankingsEnabled && stockOfDay"));
    const awaitingIdx = ternary.indexOf("rankingsAwaiting");
    const disabledIdx = ternary.indexOf("rankingsDisabled");
    expect(awaitingIdx).toBeGreaterThan(-1);
    expect(disabledIdx).toBeGreaterThan(-1);
    // the awaiting branch sits BEFORE the disabled branch in the else chain
    expect(awaitingIdx).toBeLessThan(disabledIdx);
    // the awaiting branch is guarded by the flag being on
    expect(ternary.slice(0, awaitingIdx)).toMatch(/rankingsEnabled\s*\?/);
  });

  it("the awaiting note states the licence reason and the no-seed-ranking promise (en)", () => {
    const en = read("messages/en.json");
    expect(en).toContain("Rankings are on");
    expect(en).toContain("licence is pending");
    expect(en).toContain("no seed-derived ranking is shown");
  });

  it("both key pairs exist in every locale catalog (i18n parity)", () => {
    const files = readdirSync("messages").filter((f) => f.endsWith(".json") && f !== "pseudo.json");
    expect(files.length).toBeGreaterThanOrEqual(7);
    for (const f of files) {
      const src = read(join("messages", f));
      for (const key of ["rankingsAwaiting", "rankingsAwaitingNote", "rankingsDisabled", "rankingsDisabledNote"]) {
        expect(src, `${f} missing ${key}`).toContain(`"${key}"`);
      }
    }
    // pseudo.json is generated from en.json — regenerate, never hand-edit
    const pseudo = read("messages/pseudo.json");
    expect(pseudo).toContain('"rankingsAwaiting"');
    expect(pseudo).toContain('"rankingsAwaitingNote"');
  });
});
