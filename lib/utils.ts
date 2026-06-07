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
