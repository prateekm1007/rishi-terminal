/**
 * Round 15 (Coder Directions 2026-10-04, §8) — deployment cadence gate.
 *
 * The founder's entropy list: "deployment cadence → enforce automatically
 * where possible, rather than documenting a one-per-hour rule that can
 * still be violated". B-22 measured the cost of the undocumented rule:
 * 10 of 12 merges in one six-hour stretch never deployed (quota exhaustion
 * four times). This suite pins the C8 rule as executable logic:
 *
 *   - two production-relevant merges <60 min apart  → FAIL (the gate bites)
 *   - two production-relevant merges ≥60 min apart  → PASS
 *   - a docs-only merge inside the cadence window   → PASS (docs-only never
 *     deploys — the ignored-build-step skips it — so it owes no pacing)
 *   - a single production-relevant merge            → PASS (nothing to pace
 *     against; wall-clock age is reported)
 *
 * Rule 24 (prove the gate bites): the first case IS the deliberate
 * violation, executed against a fixture — no production merge had to be
 * manufactured for this proof.
 */
import { describe, expect, it } from "vitest";
import { evaluateCadence } from "../scripts/ci/deployCadence.mjs";

const HOUR = 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

describe("R15-F — C8 deploy cadence is executable logic", () => {
  it("BITES: two production-relevant merges 30 min apart fail the gate", () => {
    const verdict = evaluateCadence(
      [
        { sha: "aaaaaaaaaaaa", ts: NOW - 30 * 60_000, relevant: true },
        { sha: "bbbbbbbbbbbb", ts: NOW - HOUR, relevant: true },
      ],
      NOW,
    );
    expect(verdict.ok).toBe(false);
    expect(verdict.message).toContain("C8 allows at most one per 60 min");
  });

  it("PASSES: two production-relevant merges 61 min apart", () => {
    const verdict = evaluateCadence(
      [
        { sha: "aaaaaaaaaaaa", ts: NOW - 61 * 60_000, relevant: true },
        { sha: "bbbbbbbbbbbb", ts: NOW - 122 * 60_000, relevant: true },
      ],
      NOW,
    );
    expect(verdict.ok).toBe(true);
  });

  it("PASSES: a docs-only merge inside the cadence window owes no pacing", () => {
    const verdict = evaluateCadence(
      [
        { sha: "cccccccccccc", ts: NOW - 5 * 60_000, relevant: false },
        { sha: "bbbbbbbbbbbb", ts: NOW - HOUR, relevant: true },
      ],
      NOW,
    );
    expect(verdict.ok).toBe(true);
  });

  it("PASSES: a single production-relevant merge (nothing to pace against)", () => {
    const verdict = evaluateCadence(
      [{ sha: "aaaaaaaaaaaa", ts: NOW - 90 * 60_000, relevant: true }],
      NOW,
    );
    expect(verdict.ok).toBe(true);
    expect(verdict.message).toContain("age 90 min");
  });

  it("PASSES: docs-only merges never trigger the gate at all", () => {
    const verdict = evaluateCadence(
      [
        { sha: "cccccccccccc", ts: NOW - 3 * 60_000, relevant: false },
        { sha: "dddddddddddd", ts: NOW - 6 * 60_000, relevant: false },
      ],
      NOW,
    );
    expect(verdict.ok).toBe(true);
    expect(verdict.message).toContain("no production-relevant merges");
  });
});
