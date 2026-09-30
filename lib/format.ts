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
