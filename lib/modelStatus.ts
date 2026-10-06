// lib/modelStatus.ts (round 20) — the model-status contract for Short Radar
// (founder directions 9-12, 15).
//
// Single source mapping: validation artifact claims -> model status ->
// EXACT user-facing wording. The UI must render the status line from here;
// hardcoding the wording in a component is a contract violation (the
// regression test pins this module as the only wording source).
//
// Isomorphic on purpose: imported by server components and by client
// components that render the Short Radar banner. No server-only import.

import { SHORT_RADAR_VALIDATION, QVPS_SHORT_MODEL, type ShortRadarValidationClaims } from "./shortRadarValidation";

export type ShortRadarModelStatus = "unvalidated" | "structure-evaluated" | "validated";

const ALL_CRITERIA = [
  "P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "P10",
] as const;

export function shortRadarModelStatus(
  claims: ShortRadarValidationClaims = SHORT_RADAR_VALIDATION,
): ShortRadarModelStatus {
  const allGreen = ALL_CRITERIA.every((k) => claims.criteria[k] === true);
  if (allGreen && claims.realDataCriterion.status === "green") return "validated";
  if (allGreen) return "structure-evaluated";
  return "unvalidated";
}

/**
 * The exact banner suffix per status (contract section 6). Precise, not
 * alarmist (direction 11): names the signal type, the model identity, the
 * evaluation status, the data provenance, and the not-advice disclaimer.
 * Banned performance language ("validated", "proven", "accurate",
 * "predictive", "high-confidence") appears ONLY in statuses whose
 * acceptance test establishes the claim.
 */
export function shortRadarStatusLine(
  claims: ShortRadarValidationClaims = SHORT_RADAR_VALIDATION,
): string {
  const v = `v${QVPS_SHORT_MODEL.version}`;
  switch (shortRadarModelStatus(claims)) {
    case "validated":
      return (
        `Research signal — QVPS short screen ${v} — historically evaluated out of sample; ` +
        "not investment advice."
      );
    case "structure-evaluated":
      return (
        `Research signal — QVPS short screen ${v} — passed the pre-registered synthetic ` +
        "walk-forward battery (round 20); not yet validated on real historical outcomes; " +
        "inputs seed-derived. Not investment advice."
      );
    case "unvalidated":
      return (
        `Research signal — QVPS short screen ${v} — model not validated; ` +
        "inputs seed-derived. Not investment advice."
      );
  }
}
