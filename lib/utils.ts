export const clamp = (v: number, lo = 0, hi = 100) =>
  Math.max(lo, Math.min(hi, v));

export const sc = (s: number) =>
  s >= 80 ? '#10B981' : s >= 60 ? '#F59E0B' : s >= 40 ? '#818CF8' : '#EF4444';

export const lbl = (s: number) =>
  s >= 80 ? 'HIGH' : s >= 60 ? 'MOD' : s >= 40 ? 'LOW' : 'WEAK';

export const getSig = (s: number) =>
  s >= 72 ? 'BUY' : s >= 52 ? 'HOLD' : 'AVOID';

export const SIG: Record<string, string> = {
  BUY: '#10B981',
  HOLD: '#F59E0B',
  AVOID: '#EF4444',
};

// T11: finite-guard helpers. Scorers must never propagate NaN/Infinity.
/** Returns v when finite, otherwise null ("insufficient data"). */
export const fin = (v: number): number | null => (Number.isFinite(v) ? v : null);

/** Division that returns null instead of Infinity/NaN when the divisor is 0
 *  or either operand is non-finite. Callers treat null as "insufficient data". */
export const safeDiv = (a: number, b: number): number | null =>
  Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? a / b : null;
