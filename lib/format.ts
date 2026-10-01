/**
 * Shared number formatters (P0-06).
 *
 * Centralised so that components/app render through <DataValue> instead of
 * sprinkling toFixed over market numbers; the remaining per-format rules
 * live here where they can be tested once.
 */

export function formatMetric(value: number | null, digits = 1): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

/** Crore-scale market cap, e.g. 1234567 → "₹12.3L Cr" style shorthand. */
export function formatCr(value: number | null, digits = 0): string {
  return formatMetric(value, digits);
}

export function formatPct(value: number | null, digits = 1): string {
  return formatMetric(value, digits);
}

/**
 * USD compact scale with thousands separators (round-5 audit, finding 15):
 * "$1950.0B" for a $1.95T asset both hides the magnitude tier and renders
 * without separators. ≥ $1T shows the T tier; below that, B with Indian
 * grouping so a $195,050,000,000 cap reads $1,95,050.0B rather than
 * $195050000000B-style mush. Returns "—" for non-finite input.
 */
export function formatUsdCompact(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value < 0) return "—";
  if (value >= 1e12) {
    return `$${(value / 1e12).toLocaleString("en-IN", { maximumFractionDigits: 2 })}T`;
  }
  return `$${(value / 1e9).toLocaleString("en-IN", { maximumFractionDigits: 1 })}B`;
}
