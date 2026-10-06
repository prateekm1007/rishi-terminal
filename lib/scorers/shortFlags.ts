// lib/scorers/shortFlags.ts (round 20) — THE one definition of the Short
// Radar trigger flags (rule 14: one source of truth per concept).
//
// Used by BOTH the product path (lib/scoring/rankings.ts -> computeShortRadar
// gate + displayed rationale) and the validation battery (the heuristic
// control factor and the candidate gate). The flag cutoffs are the
// product's declared trigger thresholds; the battery pre-registered them
// as the heuristic baseline (contract section 3, P2).
//
// Null semantics (v2-2): a null/undefined field fires NO flag — missing
// data is never reinterpreted as a value (rules 3/16). Placeholder-zero
// nulling happens at the caller, which knows field provenance.

import type { StockMetrics } from "./types";

export interface ShortTriggerFlag {
  key: "overvalued" | "decay" | "leverage" | "cash_burn" | "governance";
  label: string;
  detail: string;
}

const OVERVALUED_CUTOFF = 40;
const DECAY_CUTOFF = 0;
const LEVERAGE_CUTOFF = 2;
const GOVERNANCE_CUTOFF = 25;

/**
 * Trigger flags computed from StockMetrics-shaped inputs. A flag fires
 * only on a resolvable, in-range observation; nulls never fire.
 */
export function shortFlagsFromMetrics(m: {
  pe?: number | null;
  revenueCAGR3Y?: number | null;
  debtToEquity?: number | null;
  fcfMargin?: number | null;
  promoterHolding?: number | null;
}): ShortTriggerFlag[] {
  const flags: ShortTriggerFlag[] = [];

  if (m.pe != null && m.pe > OVERVALUED_CUTOFF) {
    flags.push({
      key: "overvalued",
      label: "Overvaluation",
      detail: `P/E ${m.pe.toFixed(1)}x above ${OVERVALUED_CUTOFF}x`,
    });
  }
  if (m.revenueCAGR3Y != null && m.revenueCAGR3Y < DECAY_CUTOFF) {
    flags.push({
      key: "decay",
      label: "Revenue decay",
      detail: `revenue CAGR ${m.revenueCAGR3Y.toFixed(1)}%`,
    });
  }
  if (m.debtToEquity != null && m.debtToEquity > LEVERAGE_CUTOFF) {
    flags.push({
      key: "leverage",
      label: "High leverage",
      detail: `D/E ${m.debtToEquity.toFixed(2)}x above ${LEVERAGE_CUTOFF}x`,
    });
  }
  if (m.fcfMargin != null && m.fcfMargin < 0) {
    flags.push({
      key: "cash_burn",
      label: "Negative FCF",
      detail: "free cash flow is negative",
    });
  }
  if (m.promoterHolding != null && m.promoterHolding < GOVERNANCE_CUTOFF) {
    flags.push({
      key: "governance",
      label: "Low promoter skin-in-game",
      detail: `promoter holding ${m.promoterHolding.toFixed(1)}%`,
    });
  }
  return flags;
}
