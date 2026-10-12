/**
 * MERGE-GUARD-LATEST — CI wrapper for the merge-guard's aggregation
 * self-test (fail-first evidence in docs/evidence/round49/
 * merge-guard-latest-check.txt; the live RED was the guard refusing
 * PR #378 on a stale check-run read, 2026-10-12T03:31Z).
 *
 * The guard is Python; the repo's CI battery is vitest — this spec
 * spawns the self-test so gate-3 aggregation regressions fail the
 * quality job like any other pin. No network, no merge: --self-test
 * exercises fixtures only.
 */
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const SCRIPT = "scripts/ci/merge-guard.py";

describe("merge-guard gate 3 — latest-wins check-run aggregation", () => {
  it("the self-test passes (order-agnostic latest-wins; newer red refuses; newer in-progress waits)", () => {
    let stdout = "";
    let ok = true;
    try {
      stdout = execFileSync("python3", [SCRIPT, "--self-test"], {
        encoding: "utf-8",
        timeout: 30_000,
      });
    } catch (err) {
      ok = false;
      stdout = `${(err as { stdout?: string }).stdout ?? ""}${(err as { stderr?: string }).stderr ?? ""}`;
    }
    // positive control (B-18): the self-test speaks its GREEN line
    expect(stdout).toContain("self-test GREEN");
    expect(ok).toBe(true);
  });

  it("bites: an unknown flag still refuses (the script is reachable and argument-parsing is live)", () => {
    let failed = false;
    try {
      execFileSync("python3", [SCRIPT, "--definitely-not-a-flag"], {
        encoding: "utf-8",
        timeout: 30_000,
        stdio: "pipe",
      });
    } catch {
      failed = true; // argparse exits 2 on unknown flags — expected
    }
    expect(failed).toBe(true);
  });
});
