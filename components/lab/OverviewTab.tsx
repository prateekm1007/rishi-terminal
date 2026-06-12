'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';


import { STOCKS } from '@/data/stocks/index';
import { buildConsensus } from '@/lib/consensus';
import { loadPortfolio, type PortfolioHolding } from '@/lib/portfolio/index';
import { useLivePrices } from '@/hooks/useLivePrices';
import { useLanguage } from '../../lib/language';
import {
  clamp, toISODateOnly, parseDateSafe, daysBetween,
  formatCurrency, fmtPct, plColor, scoreColor, scoreLabel,
  fetchHistoryPoints, buildCloseMap, closestClose,
  maxDrawdownPct, computeBeta, calcXIRR,
  type HistoryPoint
} from './helpers';
import InfoTip from '@/components/lab/InfoTip';
import { MACRO_REGIME } from '@/data/economyPlus/macroData';

function useAnimatedNumber(value: number, durationMs = 650) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    if (!Number.isFinite(start) || !Number.isFinite(end)) return;

    const t0 = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = clamp((now - t0) / durationMs, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(start + (end - start) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else prevRef.current = end;
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return display;
}

function calcTWRRTotal(holdings: PortfolioHolding[], endDate: Date, historyBySymbol: Record<string, HistoryPoint[]>): number | null {
  if (holdings.length === 0) return null;

  const flowDates = Array.from(new Set(
    holdings
      .map(h => toISODateOnly(parseDateSafe(h.addedDate)))
      .filter(Boolean)
  )).sort();

  const dates = flowDates.map(d => parseDateSafe(d));
  dates.push(endDate);

  const valueAt = (d: Date, mode: 'le' | 'lt') => {
    const ds = toISODateOnly(d);
    let v = 0;
    for (const h of holdings) {
      const ad = toISODateOnly(parseDateSafe(h.addedDate));
      const include = mode === 'le' ? (ad <= ds) : (ad < ds);
      if (!include) continue;
      const px = closestClose(historyBySymbol[h.symbol], d) ?? h.avgPrice;
      v += h.shares * px;
    }
    return v;
  };

  let tw = 1;

  for (let i = 0; i < dates.length - 1; i++) {
    const d0 = dates[i];
    const d1 = dates[i + 1];

    const v0 = valueAt(d0, 'le');
    if (v0 <= 0) continue;

    const v1 = (i + 1 < dates.length - 1) ? valueAt(d1, 'lt') : valueAt(d1, 'le');
    const r = (v1 - v0) / v0;
    if (Number.isFinite(r)) tw *= (1 + r);
  }

  return (tw - 1) * 100;
}



export default function OverviewTab() {
  const { t } = useLanguage();
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [benchmark, setBenchmark] = useState<'^NSEI' | '^BSESN'>('^NSEI');

  const [whatIfSymbol, setWhatIfSymbol] = useState('');
  const [whatIfAmount, setWhatIfAmount] = useState<number>(50000);

  const [histLoading, setHistLoading] = useState(false);
  const [historyBySymbol, setHistoryBySymbol] = useState<Record<string, HistoryPoint[]>>({});
  const [benchHistory, setBenchHistory] = useState<HistoryPoint[]>([]);
  const [histError, setHistError] = useState<string | null>(null);

  const symbols = useMemo(() => holdings.map(h => h.symbol), [holdings]);
  const { prices, loading: liveLoading } = useLivePrices(symbols);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (symbols.length === 0) return;

      setHistLoading(true);
      setHistError(null);

      const minAdded = holdings.reduce((m, h) => {
        const d = parseDateSafe(h.addedDate).getTime();
        return Math.min(m, d);
      }, Date.now());

      const years = (Date.now() - minAdded) / (1000 * 60 * 60 * 24 * 365);
      const tf = years > 2.2 ? '5Y' : years > 1.2 ? '2Y' : '1Y';

      try {
        const map: Record<string, HistoryPoint[]> = {};
        for (const sym of symbols) {
          try {
            map[sym] = await fetchHistoryPoints(sym, tf);
          } catch {
            map[sym] = [];
          }
        }
        let bench: HistoryPoint[] = [];
        try { bench = await fetchHistoryPoints(benchmark, tf); } catch { bench = []; }

        if (!cancelled) {
          setHistoryBySymbol(map);
          setBenchHistory(bench);
        }
      } catch (e: any) {
        if (!cancelled) setHistError(String(e?.message || e));
      } finally {
        if (!cancelled) setHistLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [symbols.join('|'), benchmark, holdings]);

  const enriched = useMemo(() => {
    return holdings.map(h => {
      const sym = String(h.symbol ?? '').trim().toUpperCase();
      const stock = (STOCKS as any)[sym];
      const livePrice = prices[sym]?.price ?? stock?.price ?? h.avgPrice;
      const invested = h.shares * h.avgPrice;
      const current = h.shares * livePrice;
      const pl = current - invested;
      const plPct = invested > 0 ? (pl / invested) * 100 : 0;

      const consensus = stock ? buildConsensus(stock) : null;
      const score = consensus?.consensus ?? 0;
      const sector = stock?.sector ?? 'Unknown';

      const change = prices[sym]?.change;
      const changePct = prices[sym]?.changePercent24h;
      let prevPrice = livePrice;
      if (typeof change === 'number' && Number.isFinite(change) && change !== 0) prevPrice = livePrice - change;
      else if (typeof changePct === 'number' && Number.isFinite(changePct) && changePct !== 0) prevPrice = livePrice / (1 + changePct / 100);

      const prevValue = h.shares * prevPrice;

      return {
        ...h,
        symbol: sym,
        stock,
        livePrice,
        invested,
        current,
        pl,
        plPct,
        score,
        sector,
        consensus,
        tensionSpread: consensus?.tensionSpread ?? 0,
        topBull: consensus?.topBull?.full ?? '—',
        topBear: consensus?.topBear?.full ?? '—',
        prevValue,
        volume24h: prices[sym]?.volume24h ?? 0,
      };
    });
  }, [holdings, prices]);

  const totals = useMemo(() => {
    const totalInvested = enriched.reduce((s, h) => s + h.invested, 0);
    const totalCurrent  = enriched.reduce((s, h) => s + h.current, 0);
    const totalPL = totalCurrent - totalInvested;
    const totalPLPct = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

    const weightedScore = totalCurrent > 0
      ? enriched.reduce((s, h) => s + (h.score * h.current), 0) / totalCurrent
      : 0;

    const todayPrev = enriched.reduce((s, h) => s + (h.prevValue || 0), 0);
    const todayPL = totalCurrent - todayPrev;
    const todayPLPct = todayPrev > 0 ? (todayPL / todayPrev) * 100 : 0;

    const best = [...enriched].sort((a, b) => b.plPct - a.plPct)[0];
    const worst = [...enriched].sort((a, b) => a.plPct - b.plPct)[0];

    return {
      totalInvested,
      totalCurrent,
      totalPL,
      totalPLPct,
      avgScore: Math.round(weightedScore),
      todayPL,
      todayPLPct,
      best,
      worst,
    };
  }, [enriched]);

  const animatedCurrent = useAnimatedNumber(totals.totalCurrent);

  const sectorAlloc = useMemo(() => {
    const map: Record<string, number> = {};
    for (const h of enriched) {
      const sec = (h.sector && typeof h.sector === 'string' && h.sector.trim()) ? h.sector.trim() : 'Other';
      const v = Number.isFinite(h.current) ? h.current : 0;
      map[sec] = (map[sec] ?? 0) + v;
    }
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map)
      .filter(([, val]) => val > 0)
      .map(([sector, val]) => ({ sector, val, pct: total > 0 ? (val / total) * 100 : 0 }))
      .sort((a, b) => b.val - a.val);
  }, [enriched]);

  const topHoldings = useMemo(() => [...enriched].sort((a, b) => b.current - a.current).slice(0, 8), [enriched]);

  const topWeights = useMemo(() => {
    const total = totals.totalCurrent;
    if (total <= 0 || !Array.isArray(topHoldings) || topHoldings.length === 0) return [];
    return topHoldings
      .filter(h => h && typeof h.symbol === 'string' && Number.isFinite(h.current) && h.current > 0)
      .map(h => ({
        symbol: h.symbol,
        weightPct: (h.current / total) * 100,
        value: h.current,
        score: h.score ?? 0,
      }));
  }, [topHoldings, totals.totalCurrent]);  const concentration = useMemo(() => {
    const total = totals.totalCurrent;
    if (total <= 0) return { top5: 0 };
    const sorted = [...enriched].sort((a, b) => b.current - a.current);
    const top5 = (sorted.slice(0, 5).reduce((s, h) => s + h.current, 0) / total) * 100;
    return { top5 };
  }, [enriched, totals.totalCurrent]);
const avgHoldingPeriodDays = useMemo(() => {
    if (holdings.length === 0) return 0;
    const now = new Date();
    const ds = holdings.map(h => Math.max(0, daysBetween(parseDateSafe(h.addedDate), now)));
    return Math.round(ds.reduce((a, b) => a + b, 0) / ds.length);
  }, [holdings]);

  const rishiCouncil = useMemo(() => {
    if (enriched.length === 0) return null;
    const bullCount: Record<string, number> = {};
    const bearCount: Record<string, number> = {};
    let spreadSum = 0;

    for (const h of enriched) {
      if (h.topBull && h.topBull !== '—') bullCount[h.topBull] = (bullCount[h.topBull] ?? 0) + 1;
      if (h.topBear && h.topBear !== '—') bearCount[h.topBear] = (bearCount[h.topBear] ?? 0) + 1;
      spreadSum += h.tensionSpread || 0;
    }

    const portfolioBull = Object.entries(bullCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
    const portfolioBear = Object.entries(bearCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
    const avgSpread = spreadSum / Math.max(1, enriched.length);

    const spreadLabel = avgSpread < 15 ? 'Strong Consensus'
      : avgSpread < 30 ? 'Moderate Divergence'
      : avgSpread < 50 ? 'Philosophical Tension'
      : 'Deep Conflict';

    const verdict =
      avgSpread < 15
        ? 'The Council largely agrees. Your portfolio has coherent philosophy and consistent conviction.'
        : avgSpread < 30
        ? 'The Council is mildly divided. Conviction exists, but a few holdings spark philosophical disagreement.'
        : avgSpread < 50
        ? 'The Council debates intensely. Expect mixed signals across holdings and higher uncertainty.'
        : 'Deep conflict detected. The Council is split sharply—revisit thesis, sizing, and risk limits.';

    return { portfolioBull, portfolioBear, avgSpread: Math.round(avgSpread), spreadLabel, verdict };
  }, [enriched]);

  const styleFit = useMemo(() => {
    const total = totals.totalCurrent;
    if (total <= 0) return { value: 0, growth: 0, blend: 0 };

    let value = 0, growth = 0, blend = 0;
    for (const h of enriched) {
      const w = h.current / total;
      const pe = h.stock?.pe ?? 0;
      const g = h.stock?.revcagr ?? 0;

      if (pe > 0 && g > 0) {
        if (pe <= 20 && g <= 12) value += w;
        else if (g >= 15 && pe >= 25) growth += w;
        else blend += w;
      } else {
        blend += w;
      }
    }

    return { value: value * 100, growth: growth * 100, blend: blend * 100 };
  }, [enriched, totals.totalCurrent]);

  const fcfYieldPct = useMemo(() => {
    const total = totals.totalCurrent;
    if (total <= 0) return 0;

    let y = 0;
    for (const h of enriched) {
      const stock = h.stock;
      const fcf = stock?.fcf;
      const mktcap = stock?.mktcap;
      if (typeof fcf !== 'number' || typeof mktcap !== 'number' || mktcap <= 0) continue;
      const w = h.current / total;
      y += w * (fcf / mktcap) * 100;
    }
    return y;
  }, [enriched, totals.totalCurrent]);

  const cyclicalRisk = useMemo(() => {
    const cyc = new Set(['Energy', 'Infra', 'Metals', 'Auto', 'Realty', 'Telecom', 'Banking', 'Capital Goods', 'Industrials']);
    const total = totals.totalCurrent;
    if (total <= 0) return 0;
    const cycWeight = enriched.reduce((s, h) => s + (cyc.has(h.sector) ? h.current : 0), 0) / total;
    return cycWeight * 100;
  }, [enriched, totals.totalCurrent]);

  const liquidityRisk = useMemo(() => {
    const total = totals.totalCurrent;
    if (total <= 0) return 0;

    let risk = 0;
    for (const h of enriched) {
      const tradedValue = Math.max(1, (h.volume24h || 0) * (h.livePrice || 0));
      const ratio = h.current / tradedValue;
      const perHoldingRisk = clamp(ratio * 120, 0, 100);
      const w = h.current / total;
      risk += w * perHoldingRisk;
    }
    return risk;
  }, [enriched, totals.totalCurrent]);
const [beta, setBeta] = useState<number | null>(null);
  const [maxDD, setMaxDD] = useState<number | null>(null);

  useEffect(() => {
    if (symbols.length === 0) return;
    if (!benchHistory || benchHistory.length < 40) { setBeta(null); setMaxDD(null); return; }

    const benchTail = benchHistory.slice(-260);
    const benchMap = buildCloseMap(benchTail);

    const symMaps: Record<string, Record<string, number>> = {};
    for (const s of symbols) symMaps[s] = buildCloseMap((historyBySymbol[s] || []).slice(-260));

    const dates = benchTail.map(p => p.date);
    const benchVals = dates.map(d => benchMap[d]).filter(v => Number.isFinite(v));

    const portVals: number[] = [];
    for (const d of dates) {
      let v = 0;
      for (const h of holdings) {
        const ad = toISODateOnly(parseDateSafe(h.addedDate));
        if (ad > d) continue;
        const px = symMaps[h.symbol]?.[d];
        const p2 = typeof px === 'number' ? px : null;
        v += h.shares * (p2 ?? (STOCKS as any)[h.symbol]?.price ?? h.avgPrice);
      }
      portVals.push(v);
    }

    const n = Math.min(portVals.length, benchVals.length);
    const pv = portVals.slice(-n);
    const bv = benchVals.slice(-n);

    const b = computeBeta(pv, bv);
    setBeta(b);

    const dd = maxDrawdownPct(pv);
    setMaxDD(dd);
}, [symbols.join('|'), benchHistory.length, Object.keys(historyBySymbol).length, holdings]);

  const timeframes = useMemo(() => ([
    { key: '7D', days: 7 },
    { key: '30D', days: 30 },
    { key: '90D', days: 90 },
    { key: '1Y', days: 365 },
  ]), []);

  const timeframeReturns = useMemo(() => {
    const end = new Date();
    const bench = benchHistory;
    const out: Array<{ key: string; portRetPct: number | null; benchRetPct: number | null; outperfPct: number | null; holdingsUsed: number }> = [];

    for (const tf of timeframes) {
      const start = new Date(end.getTime() - tf.days * 24 * 60 * 60 * 1000);

      // Price-only trailing return for holdings that existed at the start of the window.
      // This becomes historically accurate ONLY if addedDate is the true purchase date.
      let startValue = 0;
      let endValue = 0;
      let used = 0;

      for (const h of holdings) {
        const ad = parseDateSafe(h.addedDate);
        if (ad.getTime() > start.getTime()) continue;

        const sym = String(h.symbol ?? '').trim().toUpperCase();
        const stock = (STOCKS as any)[sym];
        const startPx = closestClose(historyBySymbol[sym], start) ?? stock?.price ?? h.avgPrice;
        const endPx = prices[sym]?.price ?? stock?.price ?? h.avgPrice;

        if (!Number.isFinite(startPx) || startPx <= 0) continue;
        if (!Number.isFinite(endPx) || endPx <= 0) continue;

        startValue += h.shares * startPx;
        endValue += h.shares * endPx;
        used++;
      }

      const portRet: number | null = startValue > 0 ? ((endValue / startValue) - 1) * 100 : null;

      let benchRet: number | null = null;
      if (bench && bench.length > 5) {
        const b0 = closestClose(bench, start);
        const b1 = bench[bench.length - 1]?.close;
        if (b0 != null && b1 != null && Number.isFinite(b0) && Number.isFinite(b1) && b0 > 0) {
          benchRet = ((b1 / b0) - 1) * 100;
        }
      }

      const outperf = (portRet != null && benchRet != null) ? (portRet - benchRet) : null;
      out.push({ key: tf.key, portRetPct: portRet, benchRetPct: benchRet, outperfPct: outperf, holdingsUsed: used });
    }

    return out;
  }, [holdings, historyBySymbol, benchHistory, prices, timeframes]);

  const xirrPct = useMemo(() => {
    if (holdings.length === 0 || totals.totalCurrent <= 0) return null;
    const cfs: Array<{ date: Date; amount: number }> = [];

    for (const h of holdings) {
      const d = parseDateSafe(h.addedDate);
      cfs.push({ date: d, amount: -(h.shares * h.avgPrice) });
    }
    cfs.push({ date: new Date(), amount: totals.totalCurrent });

    return calcXIRR(cfs);
  }, [holdings, totals.totalCurrent]);

  const twrrTotalPct = useMemo(() => {
    if (holdings.length === 0 || totals.totalCurrent <= 0) return null;
    return calcTWRRTotal(holdings, new Date(), historyBySymbol);
  }, [holdings, totals.totalCurrent, Object.keys(historyBySymbol).length]);  const overallRiskScore = useMemo(() => {
    const betaRisk = beta == null ? 50 : clamp(50 + (beta - 1) * 35, 0, 100);
    const concRisk = clamp((concentration.top5 / 80) * 100, 0, 100);
    const macroRisk = clamp(cyclicalRisk, 0, 100);
    const score = (0.30 * concRisk) + (0.30 * betaRisk) + (0.25 * liquidityRisk) + (0.15 * macroRisk);
    return clamp(score, 0, 100);
  }, [beta, concentration.top5, cyclicalRisk, liquidityRisk]);

  const macroFit = useMemo(() => {
    const aligned = sectorAlloc
      .filter(s => ['Banking','FMCG','Consumer','Insurance'].includes(s.sector))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 2);

    const misaligned = sectorAlloc
      .filter(s => ['Metals','Realty','Infra','Energy','Auto','NBFC'].includes(s.sector))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 2);

    const score = clamp(
      70 + aligned.reduce((sum, s) => sum + Math.min(10, s.pct * 0.35), 0)
         - misaligned.reduce((sum, s) => sum + Math.min(10, s.pct * 0.35), 0),
      0,
      100
    );

    return { score, regime: MACRO_REGIME.label, aligned, misaligned };
  }, [sectorAlloc]);
const rebalanceSuggestions = useMemo(() => {
    const total = totals.totalCurrent;
    if (total <= 0) return [];

    const list = enriched.map(h => ({
      symbol: h.symbol,
      weight: h.current / total,
      score: h.score,
      sector: h.sector,
    }));

    const suggestions: Array<{ kind: 'trim' | 'add' | 'review'; text: string }> = [];

    for (const h of list) {
      if (h.weight >= 0.22 && h.score < 60) {
        suggestions.push({ kind: 'trim', text: 'Trim ' + h.symbol + ' (weight ' + Math.round(h.weight * 100) + '%, score ' + h.score + '). Consider reducing concentration.' });
      }
    }

    for (const h of list) {
      if (h.weight <= 0.06 && h.score >= 75) {
        suggestions.push({ kind: 'add', text: 'Add to ' + h.symbol + ' (score ' + h.score + ', underweighted). Strong conviction deserves sizing.' });
      }
    }

    for (const h of enriched) {
      if ((h.tensionSpread || 0) >= 40) {
        suggestions.push({ kind: 'review', text: 'Review thesis for ' + h.symbol + ' (spread ' + h.tensionSpread + '). ' + (h.tensionSpread < 40 ? 'Mild disagreement.' : h.tensionSpread < 60 ? 'Moderate disagreement.' : h.tensionSpread < 80 ? 'Significant disagreement.' : 'Sharp division.') });
      }
    }

    if (suggestions.length === 0) suggestions.push({ kind: 'review', text: 'No urgent actions. Maintain discipline; revisit positions with new information.' });
    return suggestions.slice(0, 6);
  }, [enriched, totals.totalCurrent]);

  const card: React.CSSProperties = {
    padding: 20,
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(30,41,59,0.8)',
    borderRadius: 10,
  };

  const label: React.CSSProperties = {
    fontSize: 10,
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: 'uppercase' as const,
  };

  const gauge = (v: number) => {
    const pct = clamp(v, 0, 100);
    const stroke = pct < 35 ? '#22C55E' : pct < 60 ? '#D4AF37' : pct < 80 ? '#F97316' : '#EF4444';
    const circ = 2 * Math.PI * 36;
    const dash = (pct / 100) * circ;
    return (
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r="36" stroke="rgba(148,163,184,0.18)" strokeWidth="8" fill="none" />
        <circle cx="48" cy="48" r="36" stroke={stroke} strokeWidth="8" fill="none"
          strokeDasharray={dash + ' ' + (circ - dash)}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
        />
        <text x="48" y="52" textAnchor="middle" fontFamily="monospace" fontSize="16" fontWeight="800" fill="#E2E8F0">{Math.round(pct)}</text>
      </svg>
    );
  };

  if (holdings.length === 0) {
    return (
      <div style={{ padding: 64, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>◉</div>
        <h2 style={{ color: '#D4AF37', fontFamily: 'monospace', fontSize: 20, marginBottom: 12 }}>
          Your Portfolio is Empty
        </h2>
        <p style={{ color: '#64748B', marginBottom: 24, lineHeight: 1.6 }}>
          Add your first holding to unlock Overview metrics, risk, returns, and Council intelligence.
        </p>
        <Link
          href="/lab?tab=holdings"
          style={{
            padding: '10px 24px',
            background: 'rgba(212,175,55,0.15)',
            border: '1px solid rgba(212,175,55,0.4)',
            borderRadius: 6,
            color: '#D4AF37',
            textDecoration: 'none',
            fontFamily: 'monospace',
            fontSize: 13,
            letterSpacing: 1,
          }}
        >
          + Add First Holding
        </Link>
      </div>
    );
  }

  const whatIfStock = (STOCKS as any)[whatIfSymbol.trim().toUpperCase()];
  const whatIfLtp = whatIfSymbol ? (prices[whatIfSymbol.trim().toUpperCase()]?.price ?? whatIfStock?.price ?? 0) : 0;
  const whatIfShares = (whatIfLtp > 0) ? (whatIfAmount / whatIfLtp) : 0;
  const whatIfConsensus = whatIfStock ? buildConsensus(whatIfStock) : null;
  const whatIfScore = whatIfConsensus?.consensus ?? 0;

  const whatIfNewValue = totals.totalCurrent + whatIfAmount;
  const whatIfNewScore = (whatIfNewValue > 0)
    ? Math.round(((totals.avgScore * totals.totalCurrent) + (whatIfScore * whatIfAmount)) / whatIfNewValue)
    : totals.avgScore;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Hero Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        <div style={card}>
          <div style={label}>{t("overview.totalInvested")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#E2E8F0', fontFamily: 'monospace' }}>
            {formatCurrency(totals.totalInvested)}
          </div>
        </div>
        <div style={card}>
          <div style={label}>{t("overview.currentValue")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#D4AF37', fontFamily: 'monospace' }}>
            {formatCurrency(animatedCurrent)}
          </div>
        </div>
        <div style={card}>
          <div style={label}>Total P&L</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: plColor(totals.totalPL), fontFamily: 'monospace' }}>
            {formatCurrency(totals.totalPL)} ({fmtPct(totals.totalPLPct)})
          </div>
          <div style={{ fontSize: 10, color: '#64748B', marginTop: 6, display: 'flex', gap: 12 }}>
            {totals.best && <span style={{ color: '#22C55E' }}>▲ {totals.best.symbol} {fmtPct(totals.best.plPct)}</span>}
            {totals.worst && <span style={{ color: '#EF4444' }}>▼ {totals.worst.symbol} {fmtPct(totals.worst.plPct)}</span>}
          </div>
        </div>
        <div style={card}>
          <div style={label}>{t("overview.portfolioRishiScore")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: scoreColor(totals.avgScore), fontFamily: 'monospace' }}>
            {totals.avgScore}/100
          </div>
          <div style={{ fontSize: 10, color: '#64748B', marginTop: 4 }}>{scoreLabel(totals.avgScore)}</div>
        </div>
      </div>

      {/* Metrics Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div style={card}>
          <div style={label}>Today P&L</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: plColor(totals.todayPL), fontFamily: 'monospace' }}>
            {formatCurrency(totals.todayPL)}
          </div>
          <div style={{ fontSize: 12, color: plColor(totals.todayPL), marginTop: 2 }}>
            {fmtPct(totals.todayPLPct)}
          </div>
        </div>
        <div style={card}>
          <div style={label}><InfoTip term="XIRR" icon={true} /></div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#D4AF37', fontFamily: 'monospace' }}>
            {xirrPct != null ? fmtPct(xirrPct) : '—'}
          </div>
        </div>
        <div style={card}>
          <div style={label}><InfoTip term="TWRR" icon={true}>{t("overview.twrrTotal")}</InfoTip></div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#38BDF8', fontFamily: 'monospace' }}>
            {twrrTotalPct != null ? fmtPct(twrrTotalPct) : '—'}
          </div>
        </div>
        <div style={card}>
          <div style={label}>{t("overview.holdings")}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#E2E8F0', fontFamily: 'monospace' }}>
            {holdings.length}
          </div>
        </div>
        <div style={card}>
          <div style={label}>{t("overview.avgHoldingPeriod")}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#94A3B8', fontFamily: 'monospace' }}>
            {avgHoldingPeriodDays}d
          </div>
        </div>        <div style={card}>
          <div style={label}>Macro Regime Fit</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: scoreColor(macroFit.score), fontFamily: 'monospace' }}>
            {macroFit.score}/100
          </div>
          <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>
            {macroFit.regime}
          </div>
        </div>
      </div>

      {/* Timeframe Returns */}
      <div style={card}>
        <div style={label}>Multi-Timeframe Returns vs {benchmark === '^NSEI' ? 'Nifty 50' : 'Sensex'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 12 }}>
          {timeframeReturns.map(tf => (
            <div key={tf.key} style={{ padding: 12, background: 'rgba(15,23,42,0.4)', borderRadius: 6 }}>
              <div style={{ fontSize: 11, color: '#64748B', marginBottom: 6 }}>{tf.key}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: plColor(tf.portRetPct ?? 0), fontFamily: 'monospace' }}>
                {tf.portRetPct != null ? fmtPct(tf.portRetPct) : '—'}
              </div>
              {tf.outperfPct != null && (
                <div style={{ fontSize: 10, color: plColor(tf.outperfPct), marginTop: 2 }}>
                  {fmtPct(tf.outperfPct)} vs bench
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: '#64748B' }}>
          Benchmark:
          <button onClick={() => setBenchmark('^NSEI')} style={{ marginLeft: 8, padding: '4px 8px', background: benchmark === '^NSEI' ? 'rgba(212,175,55,0.2)' : 'transparent', border: '1px solid rgba(148,163,184,0.3)', borderRadius: 4, color: benchmark === '^NSEI' ? '#D4AF37' : '#94A3B8', cursor: 'pointer', fontSize: 10 }}>Nifty 50</button>
          <button onClick={() => setBenchmark('^BSESN')} style={{ marginLeft: 6, padding: '4px 8px', background: benchmark === '^BSESN' ? 'rgba(212,175,55,0.2)' : 'transparent', border: '1px solid rgba(148,163,184,0.3)', borderRadius: 4, color: benchmark === '^BSESN' ? '#D4AF37' : '#94A3B8', cursor: 'pointer', fontSize: 10 }}>{t("overview.sensex")}</button>
        </div>
      </div>


      {/* Risk Summary */}
      <div style={card}>
        <div style={label}>{t("overview.riskSummary")}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginTop: 12 }}>
          <div style={{ textAlign: 'center' }}>
            {gauge(concentration.top5)}
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>Top 5 Concentration</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            {gauge(liquidityRisk)}
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>{t("overview.liquidityRisk")}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            {gauge(cyclicalRisk)}
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>{t("overview.cyclicalExposure")}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            {gauge(overallRiskScore)}
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>{t("overview.overallRisk")}</div>
          </div>
        </div>
        <div style={{ marginTop: 16, fontSize: 11, color: '#64748B', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><InfoTip term="Beta">Beta</InfoTip>: {beta != null ? beta.toFixed(2) : '—'}</div>
          <div><InfoTip term="Max Drawdown">{t("overview.maxDrawdown")}</InfoTip>: {maxDD != null ? fmtPct(maxDD) : '—'}</div>
          <div><InfoTip term="FCF Yield">{t("overview.fcfYield")}</InfoTip>: {fmtPct(fcfYieldPct)}</div>
        </div>
      </div>

      {/* Rishi Council Verdict */}
      {rishiCouncil && (
        <div style={{ ...card, background: 'linear-gradient(135deg, rgba(212,175,55,0.08), rgba(15,23,42,0.6))' }}>
          <div style={label}>◌ Rishi Council Verdict</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#D4AF37', marginTop: 8, marginBottom: 8 }}>
            {rishiCouncil.spreadLabel}
          </div>
          <div style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.7, marginBottom: 12 }}>
            {rishiCouncil.verdict}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: 11 }}>
            <div>
              <div style={{ color: '#64748B', marginBottom: 4 }}>{t("overview.portfolioBull")}</div>
              <div style={{ color: '#22C55E', fontWeight: 600 }}>{rishiCouncil.portfolioBull}</div>
            </div>
            <div>
              <div style={{ color: '#64748B', marginBottom: 4 }}>{t("overview.portfolioBear")}</div>
              <div style={{ color: '#EF4444', fontWeight: 600 }}>{rishiCouncil.portfolioBear}</div>
            </div>
            <div>
              <div style={{ color: '#64748B', marginBottom: 4 }}><InfoTip term="Disagreement Index" icon={false}>{t("overview.disagreementIndex")}</InfoTip></div>
              <div style={{ color: '#F97316', fontWeight: 700 }}>{rishiCouncil.avgSpread}/100</div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={card}>
        <div style={label}>⚡ Quick Actions & Rebalance Suggestions</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          {rebalanceSuggestions.map((sug, i) => (
            <div key={i} style={{ padding: 10, background: sug.kind === 'trim' ? 'rgba(239,68,68,0.08)' : sug.kind === 'add' ? 'rgba(34,197,94,0.08)' : 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 6, fontSize: 12, color: '#CBD5E1', lineHeight: 1.6 }}>
              <span style={{ color: sug.kind === 'trim' ? '#EF4444' : sug.kind === 'add' ? '#22C55E' : '#F97316', fontWeight: 600, marginRight: 6 }}>
                {sug.kind === 'trim' ? '▼' : sug.kind === 'add' ? '▲' : '◉'}
              </span>
              {sug.text}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <Link href="/lab?tab=intelligence" style={{ flex: 1, padding: 12, background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 6, textAlign: 'center', color: '#D4AF37', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
            Run Full Analysis →
          </Link>
          <Link href="/lab?tab=holdings" style={{ flex: 1, padding: 12, background: 'rgba(148,163,184,0.12)', border: '1px solid rgba(148,163,184,0.3)', borderRadius: 6, textAlign: 'center', color: '#94A3B8', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
            Manage Holdings
          </Link>
        </div>
      </div>

      {/* What-If Simulator */}
      <div style={{ ...card, background: 'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(15,23,42,0.6))' }}>
        <div style={label}>🔮 What-If Simulator</div>
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: '#64748B', display: 'block', marginBottom: 6 }}>{t("overview.symbol")}</label>
            <input
              type="text"
              value={whatIfSymbol}
              onChange={e => setWhatIfSymbol(e.target.value)}
              placeholder="e.g. TCS"
              list="stocks-list"
              style={{ width: '100%', padding: 8, background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.3)', borderRadius: 4, color: '#E2E8F0', fontSize: 12, fontFamily: 'monospace' }}
            />
            <datalist id="stocks-list">
              {Object.keys(STOCKS).map(s => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#64748B', display: 'block', marginBottom: 6 }}>Amount ()</label>
            <input
              type="number"
              value={whatIfAmount}
              onChange={e => setWhatIfAmount(Number(e.target.value))}
              style={{ width: '100%', padding: 8, background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.3)', borderRadius: 4, color: '#E2E8F0', fontSize: 12, fontFamily: 'monospace' }}
            />
          </div>
        </div>
        {whatIfStock && (
          <div style={{ marginTop: 16, padding: 12, background: 'rgba(56,189,248,0.1)', borderRadius: 6 }}>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>Impact if you add {whatIfShares.toFixed(2)} shares of {whatIfSymbol.toUpperCase()} @ {formatCurrency(whatIfLtp)}:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: 11 }}>
              <div>
                <div style={{ color: '#64748B', marginBottom: 4 }}>{t("overview.newPortfolioValue")}</div>
                <div style={{ color: '#38BDF8', fontWeight: 700 }}>{formatCurrency(whatIfNewValue)}</div>
              </div>
              <div>
                <div style={{ color: '#64748B', marginBottom: 4 }}>{t("overview.newRishiScore")}</div>
                <div style={{ color: scoreColor(whatIfNewScore), fontWeight: 700 }}>{whatIfNewScore}/100</div>
              </div>
              <div>
                <div style={{ color: '#64748B', marginBottom: 4 }}>{t("overview.scoreImpact")}</div>
                <div style={{ color: plColor(whatIfNewScore - totals.avgScore), fontWeight: 700 }}>
                  {whatIfNewScore - totals.avgScore >= 0 ? '+' : ''}{whatIfNewScore - totals.avgScore}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {histLoading && <div style={{ padding: 20, textAlign: 'center', color: '#64748B', fontSize: 12 }}>Loading historical data...</div>}
      {histError && <div style={{ padding: 20, textAlign: 'center', color: '#EF4444', fontSize: 12 }}>Error: {histError}</div>}
    </div>
  );
}