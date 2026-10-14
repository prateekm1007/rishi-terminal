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

  it("round 54 (#370 acceptance) + TODAY-NIFTY: the awaiting state SHOWS the two named sections", () => {
    // Founder order 2026-10-13: "When it's on, the awaiting state must
    // show 'Top Buy Signals' and 'Short Radar' with the honest empty
    // copy." TODAY-NIFTY strengthened this: the sections are now
    // PER-PANEL conditionals with the section header OUTSIDE them — the
    // headers render in EVERY flag-on state (populated or awaiting),
    // and each section's awaiting fallback carries the honest keys
    // (two occurrences, one per named section).
    expect(tail).toContain('t("dashboard2.sections.topBuySignals")');
    expect(tail).toContain('t("dashboard2.sections.shortRadar")');
    expect((tail.match(/t\("dashboard2\.rankingsAwaiting"\)/g) ?? []).length).toBe(2);
    expect((tail.match(/t\("dashboard2\.rankingsAwaitingNote"\)/g) ?? []).length).toBe(2);
  });

  it("the switched-off note renders only in the flag-off branch (source structure)", () => {
    // The flag-off branch is the outer ternary's final else: every
    // awaiting occurrence sits BEFORE the disabled keys, and the
    // disabled panel is preceded by the outer else (`</>) : (`).
    const awaitingIdx = tail.indexOf('t("dashboard2.rankingsAwaiting")');
    const disabledIdx = tail.indexOf('t("dashboard2.rankingsDisabled")');
    expect(awaitingIdx).toBeGreaterThan(-1);
    expect(disabledIdx).toBeGreaterThan(-1);
    const lastAwaiting = tail.lastIndexOf('t("dashboard2.rankingsAwaiting")');
    expect(lastAwaiting).toBeLessThan(disabledIdx);
    expect(tail.slice(Math.max(0, disabledIdx - 120), disabledIdx)).toContain("</>) : (");
    // the awaiting fallbacks are inside the flag-on branch (the outer
    // guard) — the flag-off branch renders the disabled panel only.
    expect(tail).toContain("{rankingsEnabled ? (<>");
  });

  it("the awaiting note states the truthful reason and the no-seed-ranking promise (en)", () => {
    const en = read("messages/en.json");
    expect(en).toContain("Rankings are on");
    // NSE-PERM (13 Oct 2026): the licence is RECORDED (the permission
    // letter) — the awaiting note must NOT claim it is still pending
    // (C1: the UI never states what it has not verified). The truthful
    // reason is the record set: seed rows show no verdict (P0-1).
    expect(en).not.toContain("licence is pending");
    expect(en).toContain("seed rows show no verdict");
    expect(en).toContain("NSE permission letter");
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
