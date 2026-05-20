export interface HistoryPoint {
  date: string;   // YYYY-MM-DD
  close: number;
}

export const clamp = (v: number, lo: number = 0, hi: number = 100): number =>
  Math.max(lo, Math.min(hi, v));

export const toISODateOnly = (d: Date): string => {
  const t = d?.getTime?.();
  if (!Number.isFinite(t)) return new Date().toISOString().slice(0, 10);
  return new Date(t).toISOString().slice(0, 10);
};

export const parseDateSafe = (s: string): Date => {
  const d = new Date(String(s ?? ''));
  return Number.isFinite(d.getTime()) ? d : new Date();
};

export const daysBetween = (a: Date, b: Date): number => {
  const ta = a?.getTime?.() ?? NaN;
  const tb = b?.getTime?.() ?? NaN;
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return 0;
  const diff = Math.abs(tb - ta);
  return diff / (1000 * 60 * 60 * 24);
};

export const formatCurrency = (n: number): string => {
  const v = Number.isFinite(n) ? n : 0;
  return '' + Math.round(v).toLocaleString('en-IN');
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

function dateOnlyFromAny(x: any): string | null {
  if (typeof x === 'string') {
    // already YYYY-MM-DD
    if (x.length >= 10 && x[4] === '-' && x[7] === '-') return x.slice(0, 10);
    const ms = Date.parse(x);
    if (Number.isFinite(ms)) return new Date(ms).toISOString().slice(0, 10);
    return null;
  }
  if (typeof x === 'number') {
    if (!Number.isFinite(x)) return null;
    return new Date(x).toISOString().slice(0, 10);
  }
  return null;
}

function normalizeHistory(raw: any): HistoryPoint[] {
  const arr: any[] =
    Array.isArray(raw) ? raw
    : Array.isArray(raw?.points) ? raw.points
    : Array.isArray(raw?.data) ? raw.data
    : [];

  const out: HistoryPoint[] = [];
  for (const p of arr) {
    const date =
      dateOnlyFromAny(p?.date) ??
      dateOnlyFromAny(p?.t) ??
      dateOnlyFromAny(p?.time) ??
      null;

    const close =
      (typeof p?.close === 'number' ? p.close : null) ??
      (typeof p?.c === 'number' ? p.c : null) ??
      (typeof p?.adjClose === 'number' ? p.adjClose : null) ??
      (typeof p?.value === 'number' ? p.value : null) ??
      (typeof p?.price === 'number' ? p.price : null) ??
      // IMPORTANT: use v only as a last-resort fallback (v is often volume)
      (typeof p?.v === 'number' ? p.v : null) ??
      null;

    if (!date) continue;
    if (close == null || !Number.isFinite(close)) continue;
    out.push({ date, close });
  }

  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

export async function fetchHistoryPoints(symbol: string, tf: string): Promise<HistoryPoint[]> {
  try {
    const u = '/api/history?symbol=' + encodeURIComponent(symbol) + '&tf=' + encodeURIComponent(tf);
    const res = await fetch(u);
    if (!res.ok) return [];
    const raw = await res.json();
    return normalizeHistory(raw);
  } catch {
    return [];
  }
}

export function buildCloseMap(points: HistoryPoint[]): Record<string, number> {
  const map: Record<string, number> = {};
  if (!Array.isArray(points)) return map;
  for (const p of points) {
    if (!p || typeof p.date !== 'string') continue;
    if (!Number.isFinite(p.close)) continue;
    map[p.date] = p.close;
  }
  return map;
}

// Closest close on or before target date (falls back to nearest)
export function closestClose(points: HistoryPoint[] | undefined, targetDate: Date): number | null {
  if (!Array.isArray(points) || points.length === 0) return null;
  const tgt = toISODateOnly(targetDate);

  // on or before
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    if (p?.date && p.date <= tgt) return p.close;
  }

  // fallback nearest
  let best: HistoryPoint | null = null;
  let bestDiff = Infinity;
  const tgtMs = parseDateSafe(tgt).getTime();
  for (const p of points) {
    const ms = parseDateSafe(p.date).getTime();
    const d = Math.abs(ms - tgtMs);
    if (d < bestDiff) { bestDiff = d; best = p; }
  }
  return best ? best.close : null;
}

export function maxDrawdownPct(values: number[]): number {
  if (!Array.isArray(values) || values.length === 0) return 0;
  let peak = -Infinity;
  let mdd = 0;
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    if (v > peak) peak = v;
    if (peak > 0) {
      const dd = (v - peak) / peak;
      if (dd < mdd) mdd = dd;
    }
  }
  return mdd * 100;
}

// Beta from LEVEL series (internally converts to returns)
export function computeBeta(portLevels: number[], benchLevels: number[]): number {
  const n = Math.min(portLevels?.length ?? 0, benchLevels?.length ?? 0);
  if (n < 3) return 1;

  const pr: number[] = [];
  const br: number[] = [];
  for (let i = 1; i < n; i++) {
    const p0 = portLevels[i - 1], p1 = portLevels[i];
    const b0 = benchLevels[i - 1], b1 = benchLevels[i];
    if (p0 > 0 && b0 > 0 && Number.isFinite(p1) && Number.isFinite(b1)) {
      pr.push((p1 / p0) - 1);
      br.push((b1 / b0) - 1);
    }
  }
  if (pr.length < 3) return 1;

  const mP = pr.reduce((a, x) => a + x, 0) / pr.length;
  const mB = br.reduce((a, x) => a + x, 0) / br.length;

  let cov = 0;
  let varB = 0;
  for (let i = 0; i < pr.length; i++) {
    cov += (pr[i] - mP) * (br[i] - mB);
    varB += (br[i] - mB) * (br[i] - mB);
  }
  return varB === 0 ? 1 : cov / varB;
}

// Simple XIRR (bisection). Returns %.
export function calcXIRR(cashflows: { date: Date; amount: number }[]): number | null {
  if (!Array.isArray(cashflows) || cashflows.length < 2) return null;
  const base = cashflows[0]?.date;
  if (!(base instanceof Date) || !Number.isFinite(base.getTime())) return null;

  const npvAt = (rate: number) => {
    let npv = 0;
    for (const cf of cashflows) {
      const d = cf?.date;
      const amt = cf?.amount;
      if (!(d instanceof Date) || !Number.isFinite(d.getTime())) continue;
      if (!Number.isFinite(amt)) continue;
      const years = (d.getTime() - base.getTime()) / (1000 * 60 * 60 * 24 * 365);
      npv += amt / Math.pow(1 + rate, years);
    }
    return npv;
  };

  let lo = -0.999;
  let hi = 10;
  let mid = 0;

  for (let i = 0; i < 90; i++) {
    mid = (lo + hi) / 2;
    const v = npvAt(mid);
    if (v > 0) lo = mid;
    else hi = mid;
  }
  return mid * 100;
}
