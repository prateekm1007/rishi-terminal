/**
 * Field-specific LIVE admissibility (Coder Directions G5, audit 2026-10-02).
 *
 * The resolver's old global rule — "a live number overrides the seed only
 * when it is finite and strictly positive" — reinterpreted legitimate zero
 * and negative observations as missing data and silently substituted the
 * SEED value, so the AI and the UI saw a different number than the provider
 * reported (constitution rules 15/16). Zero and negatives are REAL for many
 * fundamentals: a loss-making year drives ROE/ROCE/OPM below zero, a
 * debt-free company has D/E = 0, a promoter stake can genuinely be 0, and
 * revenue/EPS CAGR go negative in downturns.
 *
 * Per-field rules (Coder Directions table):
 *   pe            → strictly positive (a zero/negative P/E is a provider
 *                    sentinel for "no meaningful earnings", not a valuation
 *                    observation)
 *   roe / roce / opm / revcagr / epscagr → finite (negatives legitimate)
 *   de            → finite, >= 0
 *   promo         → 0..100 (percent of shares outstanding)
 *   mktcap        → > 0 (a listed company has positive market cap; a 0 or
 *                    negative value is a provider defect, keep the baseline)
 *   bvps          → finite (negative book value = negative equity; handled
 *                    explicitly downstream — the PB derivation only divides
 *                    on a positive BVPS and says "derived" either way)
 *
 * `null`/`undefined`/NaN always mean "no live data" → keep the seed
 * baseline. Missing is NEVER reinterpreted as zero and zero/negative is
 * NEVER reinterpreted as missing.
 */

export type AdmissibilityRule = (v: number) => boolean;

const finite: AdmissibilityRule = v => Number.isFinite(v);
const nonNegative: AdmissibilityRule = v => Number.isFinite(v) && v >= 0;
const positive: AdmissibilityRule = v => Number.isFinite(v) && v > 0;
const inRange =
  (lo: number, hi: number): AdmissibilityRule =>
  v =>
    Number.isFinite(v) && v >= lo && v <= hi;

export const LIVE_ADMISSIBILITY: Record<string, AdmissibilityRule> = {
  // pe: strictly positive — a P/E of exactly 0 is a provider sentinel for
  // "no meaningful earnings" (price/earnings cannot be 0 while listed), so
  // it keeps the baseline like a missing field rather than overriding it
  // with a meaningless zero.
  pe: positive,
  roe: finite,
  roce: finite,
  opm: finite,
  de: nonNegative,
  promo: inRange(0, 100),
  revcagr: finite,
  epscagr: finite,
  mktcap: positive,
  bvps: finite,
};

/**
 * Is this live value a legitimate observation for the field (and therefore
 * allowed to override the seed baseline)? Unknown fields default to the
 * strict legacy rule (finite AND positive) — fail-closed for fields the
 * table does not describe yet.
 */
export function isAdmissibleLive(field: string, v: number): boolean {
  const rule = LIVE_ADMISSIBILITY[field];
  if (rule) return rule(v);
  return Number.isFinite(v) && v > 0;
}
