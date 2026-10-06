/**
 * Round 20 — model-status contract tests (founder directions 9-12, 14-15).
 *
 * 1. Unit: the status derivation and the EXACT wording per status (the
 *    strings are contract section 6, fixed before any of them rendered).
 * 2. Direction 15 regression guard: the Short Radar banner must derive its
 *    wording from lib/modelStatus (the contract) — never a hardcoded
 *    string. A future unvalidated model automatically renders the
 *    unvalidated copy; a validated model renders the validated copy only
 *    while the evidence artifact actually passes (the artifact is
 *    re-verified against a fresh battery run by
 *    test/shortRadar.validation.test.ts).
 * 3. Direction 10 banned-performance-language guard.
 *
 * Fail-first evidence: the source pin (guard 2) was run against the
 * pre-fix DashboardTail (hardcoded "unvalidated model" suffix) and failed;
 * raw output in the PR.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { shortRadarModelStatus, shortRadarStatusLine } from "@/lib/modelStatus";
import { SHORT_RADAR_VALIDATION, QVPS_SHORT_MODEL, type ShortRadarValidationClaims } from "@/lib/shortRadarValidation";

const V = `v${QVPS_SHORT_MODEL.version}`;

const fixture = (over: Partial<ShortRadarValidationClaims>): ShortRadarValidationClaims => ({
  ...SHORT_RADAR_VALIDATION,
  ...over,
  criteria: { ...SHORT_RADAR_VALIDATION.criteria, ...(over.criteria ?? {}) },
});

const ALL_TRUE = {
  P1: true, P2: true, P3: true, P4: true, P5: true,
  P6: true, P7: true, P8: true, P9: true, P10: true,
};

describe("model-status contract (round 20)", () => {
  it("derives the status from the artifact claims", () => {
    expect(shortRadarModelStatus()).toBe("unvalidated"); // the current, honest state
    expect(shortRadarModelStatus(fixture({ criteria: { ...ALL_TRUE, P2: false } }))).toBe("unvalidated");
    expect(shortRadarModelStatus(fixture({ criteria: ALL_TRUE }))).toBe("structure-evaluated");
    expect(
      shortRadarModelStatus(fixture({ criteria: ALL_TRUE, realDataCriterion: { id: "R1", status: "green" } })),
    ).toBe("validated");
  });

  it("renders the EXACT contract wording per status", () => {
    expect(shortRadarStatusLine()).toBe(
      `Research signal — QVPS short screen ${V} — model not validated; inputs seed-derived. Not investment advice.`,
    );
    expect(shortRadarStatusLine(fixture({ criteria: ALL_TRUE }))).toBe(
      `Research signal — QVPS short screen ${V} — passed the pre-registered synthetic walk-forward battery (round 20); ` +
      "not yet validated on real historical outcomes; inputs seed-derived. Not investment advice.",
    );
    expect(
      shortRadarStatusLine(fixture({ criteria: ALL_TRUE, realDataCriterion: { id: "R1", status: "green" } })),
    ).toBe(
      `Research signal — QVPS short screen ${V} — historically evaluated out of sample; not investment advice.`,
    );
  });

  it("direction 11: every status names a research signal and carries the not-advice disclaimer", () => {
    for (const claims of [
      SHORT_RADAR_VALIDATION,
      fixture({ criteria: ALL_TRUE }),
      fixture({ criteria: ALL_TRUE, realDataCriterion: { id: "R1", status: "green" } }),
    ]) {
      const line = shortRadarStatusLine(claims);
      expect(line).toMatch(/^Research signal —/);
      expect(line).toMatch(/not investment advice\.$/i);
    }
  });

  it("direction 12: while inputs are seed-derived the copy says so", () => {
    // The current artifact has seed-only inputs; every reachable status
    // until live inputs exist must carry the seed provenance sentence.
    const line = shortRadarStatusLine();
    expect(line).toContain("inputs seed-derived");
  });

  it("direction 10: no performance language beyond what the status establishes", () => {
    const lines = [
      shortRadarStatusLine(),
      shortRadarStatusLine(fixture({ criteria: ALL_TRUE })),
      shortRadarStatusLine(fixture({ criteria: ALL_TRUE, realDataCriterion: { id: "R1", status: "green" } })),
    ];
    for (const line of lines) {
      expect(line).not.toMatch(/\b(proven|accurate|predictive|high-confidence)\b/i);
      // "validated" may appear ONLY negated ("not validated", "not yet
      // validated") unless the status IS validated.
      const stripped = line.replace(/not (yet )?validated/g, "");
      const isValidatedStatus = line.includes("historically evaluated out of sample");
      if (!isValidatedStatus) {
        expect(stripped).not.toMatch(/\bvalidated\b/i);
      }
    }
  });

  it("direction 15 regression guard: the banner wording comes from the contract, never a hardcoded string", () => {
    const src = readFileSync(
      path.resolve(__dirname, "..", "components", "dashboard", "DashboardTail.tsx"),
      "utf8",
    );
    // The component imports and calls the contract...
    expect(src).toContain("shortRadarStatusLine");
    // ...and the old hardcoded copy can never return.
    expect(src).not.toContain("unvalidated model");
    expect(src).not.toContain("ranked by QVPS short screen (");
    // Positive control (C10): the file still renders the Short Radar section
    // and its seed banner — an absence must not pass this guard.
    expect(src).toContain("SeedDataBanner");
    expect(src).toContain("shortRadar");
  });

  it("the model carries the canonical version identity (direction 9)", () => {
    expect(QVPS_SHORT_MODEL).toEqual({ id: "qvps-short", version: 2 });
  });
});
