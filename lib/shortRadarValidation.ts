// lib/shortRadarValidation.ts (round 20) — the CHECKED-IN claims summary of
// the Short Radar model-validation battery.
//
// This module is the single source the UI status derives from (via
// lib/modelStatus.ts). It is mechanically verified by
// test/shortRadar.validation.test.ts, which re-runs the deterministic
// battery and fails CI if any claim here diverges from a fresh run — a
// validated status is therefore only renderable while the evidence
// actually passes (founder direction 15).
//
// Criteria are pre-registered in
// docs/evidence/round20/short-radar-validation-contract.md (section 3;
// pre-run amendment A1 in section 8). R1 — the real-historical
// out-of-sample criterion — requires licensed point-in-time NSE
// fundamentals (D1-04/D1-05, FD-1) and is OPEN: the model status can
// never rise above "structure-evaluated" until it runs.

export interface ShortRadarCriteriaClaims {
  /** Harness validity: prophet IC > 0.999, shuffled |IC| < 0.05. */
  P1: boolean;
  /** Information beyond the hand-written heuristic (>= 0.10 and >= heuristic + 0.05). */
  P2: boolean;
  /** No duplicate information (pillar correlation <= 0.90; beats best pillar + 0.02). */
  P3: boolean;
  /** Signal stability across window halves (|delta IC| <= 0.10). */
  P4: boolean;
  /** No look-ahead leakage (delayed filings decay IC by >= 0.03). */
  P5: boolean;
  /** Survivorship direction (survivor-only CAGR inflates by >= 50 bps). */
  P6: boolean;
  /** Calibration reachability (maximal-risk fixture >= 90; >= 3 bands populated). */
  P7: boolean;
  /** Regimes (IC > 0 in >= 3 of 4 benchmark epochs). */
  P8: boolean;
  /** Concentration (mean top-3 same-sector rate <= 2/3). */
  P9: boolean;
  /** Rationale traceability + placeholder-zero suppression (mechanical). */
  P10: boolean;
}

export interface ShortRadarValidationClaims {
  battery: "synthetic-walk-forward-round20";
  worldSeed: number;
  criteria: ShortRadarCriteriaClaims;
  realDataCriterion: { id: "R1"; status: "open-fd1" | "green" };
}

/**
 * Claims state = the RED run (2026-10-06, main @ 25dec82 + contract):
 * the v1 model fails P2/P3/P7/P10 (information, duplication, calibration,
 * rationale) and satisfies the harness/stability/leakage/survivorship/
 * regime/concentration criteria. These claims are mechanically verified
 * by test/shortRadar.validation.test.ts + test/shortRadar.rationale.test.ts;
 * the repair PR flips a claim to true ONLY when the freshly-run battery
 * actually passes it.
 */
export const SHORT_RADAR_VALIDATION: ShortRadarValidationClaims = {
  battery: "synthetic-walk-forward-round20",
  worldSeed: 20261006,
  criteria: {
    P1: true,
    P2: false,
    P3: false,
    P4: true,
    P5: true,
    P6: true,
    P7: false,
    P8: true,
    P9: true,
    P10: false,
  },
  realDataCriterion: { id: "R1", status: "open-fd1" },
};
