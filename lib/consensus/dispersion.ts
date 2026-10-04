// lib/consensus/dispersion.ts
// S2-06 (Round 13): the DISAGREEMENT metric — population standard
// deviation of the valid Rishi scores on one stock.
//
// Definition (docs/methodology/dispersion.md is the normative text):
//   - input: the per-Rishi verdicts of ONE stock; null verdicts
//     ("insufficient data", T11) are EXCLUDED, never coerced to 0 —
//     a missing opinion is not a 0/100 opinion (rule 16);
//   - population (÷N), not sample (÷(N-1)): the panel IS the whole
//     population being measured — we are not estimating a variance
//     from a sample of it;
//   - unit: score points on the 0-100 scale; 0 = unanimous;
//   - null when fewer than 2 valid scores: one number cannot disagree
//     with itself, and pretending 0 would LAUNDER "one voice" as
//     "perfect agreement" (rule 3).
//
// Why a dispersion metric at all (the acceptance's constructed cases
// pin it): tensionSpread (max − min) is dominated by the two extreme
// voices; σ uses every valid verdict and is the scale the weighted
// consensus itself is measured on. Unanimous → 0; split → high.

/**
 * Population standard deviation of the valid scores; null when fewer
 * than 2 are valid. Monotone in spread for fixed N and mean (pinned by
 * test/consensus.dispersion.test.ts).
 */
export function dispersion(scores: Array<number | null>): number | null {
  const valid = scores.filter((s): s is number => typeof s === 'number' && Number.isFinite(s));
  if (valid.length < 2) return null;
  const mean = valid.reduce((a, s) => a + s, 0) / valid.length;
  const variance = valid.reduce((a, s) => a + (s - mean) ** 2, 0) / valid.length;
  return Math.sqrt(variance);
}
