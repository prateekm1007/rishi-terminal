/**
 * Round 16 C2 — the cadence rule becomes a MERGE gate, not a red-main alarm.
 *
 * Founder Round-16 C2: "Move the one-merge-per-hour check to a required PR
 * check ... that blocks the merge button when it would violate C8. A
 * push-time run should only report, never fail, and the post-deploy smoke
 * must run regardless of the cadence result."
 *
 * This suite pins the two new behaviors:
 *
 *   - evaluatePrMerge (pure): merging a production-relevant PR inside the
 *     60-min window after the last production-relevant merge FAILS; a
 *     deploy-exempt PR (docs/scripts-ci/artifacts only) owes no pacing;
 *     an empty main history passes; an elapsed window passes.
 *   - --report (subprocess, fixture): the push-time mode NEVER exits
 *     non-zero — even with a 3-minute violation in the landed history
 *     (the #165→#177 incident shape). The record lives in the log; the
 *     blocking lives on the PR check.
 *
 * Rule 24 (prove the gate bites): the first case is the deliberate
 * violation against a fixture; the in-repo bite-proof (a PR opened inside
 * the window showing the required check red) is captured in the PR body.
 */
import { describe, expect, it } from "vitest";
import { evaluatePrMerge } from "../scripts/ci/deployCadence.mjs";

const MIN = 60_000;
const NOW = 1_800_000_000_000;

describe("R16-C2 — the PR-time merge gate (blocks the merge button)", () => {
  it("BITES: a production-relevant PR 30 min after the last relevant merge fails", () => {
    const verdict = evaluatePrMerge({
      lastRelevantTs: NOW - 30 * MIN,
      prRelevant: true,
      now: NOW,
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.message).toContain("earliest safe merge");
  });

  it("PASSES: the same PR once the 60-min window has elapsed (61 min)", () => {
    const verdict = evaluatePrMerge({
      lastRelevantTs: NOW - 61 * MIN,
      prRelevant: true,
      now: NOW,
    });
    expect(verdict.ok).toBe(true);
  });

  it("PASSES: a deploy-exempt PR (docs-only) inside the window owes no pacing", () => {
    const verdict = evaluatePrMerge({
      lastRelevantTs: NOW - 5 * MIN,
      prRelevant: false,
      now: NOW,
    });
    expect(verdict.ok).toBe(true);
    expect(verdict.message).toContain("deploy-exempt");
  });

  it("PASSES: no production-relevant merges on main (nothing to pace against)", () => {
    const verdict = evaluatePrMerge({
      lastRelevantTs: null,
      prRelevant: true,
      now: NOW,
    });
    expect(verdict.ok).toBe(true);
  });
});

describe("R16-C2 — the push-time run only reports, never fails", () => {
  it("--report exits 0 on a 3-minute violation (the #165→#177 incident shape)", async () => {
    const { execFileSync } = await import("node:child_process");
    const { writeFileSync, mkdtempSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { tmpdir } = await import("node:os");

    const dir = mkdtempSync(join(tmpdir(), "c2-report-"));
    // The 2026-10-05 03:07/03:10 incident: #165 and #177, 3.07 min apart.
    const fixture = join(dir, "violation.json");
    writeFileSync(
      fixture,
      JSON.stringify([
        { sha: "c7b8d174".padEnd(40, "0"), ts: 1_768_154_225_000, relevant: true },
        { sha: "6232d098".padEnd(40, "0"), ts: 1_768_154_225_000 - 3.07 * 60_000, relevant: true },
      ]),
    );
    const out = execFileSync(
      process.execPath,
      ["scripts/ci/deployCadence.mjs", "--report", "--fixture", fixture],
      { encoding: "utf8", cwd: new URL("..", import.meta.url).pathname },
    );
    // The violation IS reported (audit trail preserved) ...
    expect(out).toContain("FAIL");
    expect(out).toContain("3.1 min");
    // ... but the exit code is 0 — report-only by construction.
  });
});
