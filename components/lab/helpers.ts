export const clamp = (v: number, lo: number = 0, hi: number = 100): number =>
  Math.max(lo, Math.min(hi, v));

export const toISODateOnly = (d: Date): string => d.toISOString().split('T')[0];

export const parseDateSafe = (s: string): Date => {
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date() : d;
};

export const daysBetween = (a: Date, b: Date): number => {
  const diff = Math.abs(b.getTime() - a.getTime());
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

export const formatCurrency = (n: number): string => {
  if (!Number.isFinite(n)) return '0';
  return '' + n.toLocaleString('en-IN');
};

export const fmtPct = (n: number): string => {
  const v = Number.isFinite(n) ? n : 0;
  return (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
};

export const plColor = (n: number): string =>
  n > 0 ? '#22C55E' : n < 0 ? '#EF4444' : '#94A3B8';

export const scoreColor = (s: number): string =>
  s >= 75 ? '#22C55E' : s >= 55 ? '#D4AF37' : '#EF4444';

export const scoreLabel = (s: number): string =>
  s >= 75 ? 'High Conviction' : s >= 55 ? 'Balanced' : s >= 35 ? 'Conflict' : 'Avoid';

export const fetchHistoryPoints = async (symbol: string, tf: string): Promise<any[]> => {
  try {
    const res = await fetch(`/api/history?symbol=${symbol}&tf=${tf}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
};

export const buildCloseMap = (points: any[]): Record<string, number> => {
  const map: Record<string, number> = {};
  for (const p of points) {
    const date = typeof p.t === 'string' ? p.t : new Date(p.t).toISOString().split('T')[0];
    map[date] = p.v ?? p.close ?? 0;
  }
  return map;
};

export const closestClose = (points: any[], targetDate: Date): number | null => {
  if (!points || points.length === 0) return null;
  const target = targetDate.toISOString().split('T')[0];
  let closest = points[0];
  let minDiff = Infinity;
  for (const p of points) {
    const d = typeof p.t === 'string' ? p.t : new Date(p.t).toISOString().split('T')[0];
    const diff = Math.abs(new Date(d).getTime() - new Date(target).getTime());
    if (diff < minDiff) {
      minDiff = diff;
      closest = p;
    }
  }
  return closest.v ?? closest.close ?? null;
};

export const maxDrawdownPct = (values: number[]): number => {
  let peak = -Infinity;
  let mdd = 0;
  for (const v of values) {
    if (v > peak) peak = v;
    if (peak > 0) {
      const dd = (v - peak) / peak;
      if (dd < mdd) mdd = dd;
    }
  }
  return mdd * 100;
};

export const computeBeta = (portReturns: number[], benchReturns: number[]): number => {
  if (portReturns.length < 2 || benchReturns.length < 2) return 1.0;
  const n = Math.min(portReturns.length, benchReturns.length);
  const p = portReturns.slice(0, n);
  const b = benchReturns.slice(0, n);
  const pMean = p.reduce((a, x) => a + x, 0) / n;
  const bMean = b.reduce((a, x) => a + x, 0) / n;
  let cov = 0, varBench = 0;
  for (let i = 0; i < n; i++) {
    cov += (p[i] - pMean) * (b[i] - bMean);
    varBench += (b[i] - bMean) ** 2;
  }
  return varBench === 0 ? 1.0 : cov / varBench;
};

export const calcXIRR = (cashflows: { date: Date; amount: number }[]): number | null => {
  if (cashflows.length < 2) return null;
  let low = -0.999, high = 10, mid = 0;
  for (let i = 0; i < 100; i++) {
    mid = (low + high) / 2;
    let npv = 0;
    for (const cf of cashflows) {
      const days = (cf.date.getTime() - cashflows[0].date.getTime()) / (1000 * 60 * 60 * 24);
      npv += cf.amount / Math.pow(1 + mid, days / 365);
    }
    if (npv > 0) low = mid; else high = mid;
  }
  return mid * 100;
};

export type HistoryPoint = any;