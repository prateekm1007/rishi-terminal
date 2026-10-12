/**
 * PROBE-LIVENESS — CI wrapper for the post-deploy smoke's liveness
 * self-test (founder order 12 Oct 2026: the probe must prove liveness —
 * presence checks per release + render freshness — with a positive
 * control that fails the 02eac31-era render and passes the current one).
 *
 * Fail-first evidence in docs/evidence/round51/probe-liveness-red.txt
 * (wrapper fails on the pre-change script: --self-test unknown) and
 * -green.txt. The live RED was the probe passing stale pages (RESP-1R
 * lineage: probe key vs bare user key; now release markers per ship).
 *
 * The script is plain node .mjs; the repo's CI battery is vitest — this
 * spec spawns the self-test so liveness regressions fail the quality job
 * like any other pin (the merge-guard --self-test precedent). No network:
 * --self-test exercises fixtures only.
 */
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const SCRIPT = "scripts/ci/postDeploySmoke.mjs";

describe("probe liveness — release markers + render freshness discriminate old vs current", () => {
  it("the self-test passes (old render fails every new check; current passes)", () => {
    let stdout = "";
    let ok = true;
    try {
      stdout = execFileSync("node", [SCRIPT, "--self-test"], {
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
      execFileSync("node", [SCRIPT, "--definitely-not-a-flag"], {
        encoding: "utf-8",
        timeout: 30_000,
      });
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });
});
