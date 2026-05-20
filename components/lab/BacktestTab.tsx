'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { STOCKS } from '@/data/stocks/index';
import { buildConsensus } from '@/lib/consensus';
import { loadPortfolio } from '@/lib/portfolio/index';
import InfoTip from '@/components/lab/InfoTip';

type UniverseMode = 'holdings' | 'watchlist' | 'custom';
type StrategyId = 'equal_weight' | 'top_n_score' | 'score_threshold_cash';

type Timeframe = '3M' | '6M' | '1Y' | '2Y' | '5Y';

interface HistoryPoint {
  t: number | string;
  v: number;
}

interface BacktestSeriesPoint {
  t: number;
  v: number; // portfolio value indexed to 100
}

interface BacktestMetrics {
  totalReturnPct: number;
  cagrPct: number;
  volPct: number;
  sharpe: number;
  maxDrawdownPct: number;
  winRatePct: number;
  points: number;
  start: string;
  end: string;
}

interface BacktestAssetRow {
  symbol: string;
  name: string;
  score: number;
  startPrice: number;
  endPrice: number;
  returnPct: number;
  used: boolean;
}

interface BacktestResult {
  metrics: BacktestMetrics;
  series: BacktestSeriesPoint[];
  assets: BacktestAssetRow[];
  strategyLabel: string;
  universeLabel: string;
  timeframe: Timeframe;
}

const STORAGE_KEY_CFG = 'rishi_backtest_cfg_v1';
const STORAGE_KEY_WL  = 'rishi_watchlist_v2';

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function fmtPct(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
}

function fmtNum(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString('en-IN');
}

function scoreColor(s: number): string {
  return s >= 75 ? '#22C55E' : s >= 55 ? '#D4AF37' : '#EF4444';
}

function toEpochMs(t: number | string): number {
  if (typeof t === 'number') return t;
  const ms = Date.parse(t);
  return Number.isFinite(ms) ? ms : 0;
}

function stddev(xs: number[]) {
  if (xs.length < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (xs.length - 1);
  return Math.sqrt(Math.max(0, v));
}

function maxDrawdownPct(values: number[]) {
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
}

async function fetchHistory(symbol: string, tf: Timeframe): Promise<HistoryPoint[]> {
  const url = '/api/history?symbol=' + encodeURIComponent(symbol) + '&tf=' + encodeURIComponent(tf);
  const r = await fetch(url);
  if (!r.ok) throw new Error('History fetch failed for ' + symbol + ' (' + r.status + ')');
  const data: any = await r.json();

  // expected shapes:
  // - { points: [{t,v}, ...] }
  // - [{t,v}, ...]
  const pts = Array.isArray(data) ? data : (Array.isArray(data?.points) ? data.points : []);
  return (pts as any[]).map(p => ({ t: p.t, v: p.v })).filter(p => Number.isFinite(p.v));
}

function buildSparkPath(series: BacktestSeriesPoint[], w = 900, h = 240, pad = 10) {
  if (series.length < 2) return '';

  const xs = series.map(p => p.t);
  const ys = series.map(p => p.v);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const dx = Math.max(1, maxX - minX);
  const dy = Math.max(1e-9, maxY - minY);

  const sx = (x: number) => pad + ((x - minX) / dx) * (w - pad * 2);
  const sy = (y: number) => (h - pad) - ((y - minY) / dy) * (h - pad * 2);

  let d = 'M ' + sx(series[0].t) + ' ' + sy(series[0].v);
  for (let i = 1; i < series.length; i++) {
    d += ' L ' + sx(series[i].t) + ' ' + sy(series[i].v);
  }
  return d;
}

export default function BacktestTab() {
  const [universeMode, setUniverseMode] = useState<UniverseMode>('holdings');
  const [strategy, setStrategy] = useState<StrategyId>('equal_weight');
  const [timeframe, setTimeframe] = useState<Timeframe>('1Y');

  const [customSymbols, setCustomSymbols] = useState('TCS, RELIANCE, HDFCBANK, INFY');
  const [topN, setTopN] = useState(5);
  const [minScore, setMinScore] = useState(65);

  const [running, setRunning] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<BacktestResult | null>(null);

  // Restore config
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CFG);
      if (!raw) return;
      const cfg = JSON.parse(raw) as any;

      const um = (cfg.universeMode || '') as UniverseMode;
      const st = (cfg.strategy || '') as StrategyId;
      const tf = (cfg.timeframe || '') as Timeframe;

      if (um === 'holdings' || um === 'watchlist' || um === 'custom') setUniverseMode(um);
      if (st === 'equal_weight' || st === 'top_n_score' || st === 'score_threshold_cash') setStrategy(st);
      if (tf === '3M' || tf === '6M' || tf === '1Y' || tf === '2Y' || tf === '5Y') setTimeframe(tf);

      if (typeof cfg.customSymbols === 'string') setCustomSymbols(cfg.customSymbols);
      if (typeof cfg.topN === 'number') setTopN(cfg.topN);
      if (typeof cfg.minScore === 'number') setMinScore(cfg.minScore);
    } catch {
      // ignore
    }
  }, []);

  // Persist config
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_CFG, JSON.stringify({
        universeMode,
        strategy,
        timeframe,
        customSymbols,
        topN,
        minScore,
      }));
    } catch {
      // ignore
    }
  }, [universeMode, strategy, timeframe, customSymbols, topN, minScore]);

  const universeSymbols = useMemo(() => {
    const uniq: string[] = [];
    const push = (s: string) => {
      const k = (s || '').trim().toUpperCase();
      if (!k) return;
      if (!STOCKS[k]) return;
      if (uniq.includes(k)) return;
      uniq.push(k);
    };

    if (universeMode === 'holdings') {
      const p = loadPortfolio();
      for (const h of (p?.holdings ?? [])) push(h.symbol);
    }

    if (universeMode === 'watchlist') {
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(STORAGE_KEY_WL);
          const parsed = raw ? JSON.parse(raw) : [];
          if (Array.isArray(parsed)) {
            for (const it of parsed) push(it?.symbol);
          }
        } catch {
          // ignore
        }
      }
    }

    if (universeMode === 'custom') {
      const parts = (customSymbols || '').split(/[, \n\r\t]+/g);
      for (const p of parts) push(p);
    }

    // Safety limits: backtest is heavier than compare.
    return uniq.slice(0, 12);
  }, [universeMode, customSymbols]);

  const consensusBySymbol = useMemo(() => {
    const m: Record<string, number> = {};
    for (const sym of universeSymbols) {
      const s = STOCKS[sym];
      const c = s ? buildConsensus(s) : null;
      m[sym] = c?.consensus ?? 0;
    }
    return m;
  }, [universeSymbols]);

  const selectedSymbols = useMemo(() => {
    if (strategy === 'equal_weight') return universeSymbols;

    if (strategy === 'top_n_score') {
      const sorted = [...universeSymbols].sort((a, b) => (consensusBySymbol[b] ?? 0) - (consensusBySymbol[a] ?? 0));
      return sorted.slice(0, clamp(topN, 1, 12));
    }

    if (strategy === 'score_threshold_cash') {
      return universeSymbols.filter(s => (consensusBySymbol[s] ?? 0) >= clamp(minScore, 0, 100));
    }

    return universeSymbols;
  }, [universeSymbols, strategy, consensusBySymbol, topN, minScore]);

  async function runBacktest() {
    setErr('');
    setResult(null);

    if (universeSymbols.length === 0) {
      setErr('Universe is empty. Add holdings, watchlist items, or enter custom symbols.');
      return;
    }

    // For threshold strategy: allow empty (go to cash); for others require >= 1.
    if (strategy !== 'score_threshold_cash' && selectedSymbols.length === 0) {
      setErr('No assets selected. Adjust rules or universe.');
      return;
    }

    setRunning(true);
    try {
      // Fetch history for each symbol in universe (for table), but series uses selected symbols.
      const histBy: Record<string, HistoryPoint[]> = {};
      for (const sym of universeSymbols) {
        histBy[sym] = await fetchHistory(sym, timeframe);
      }

      // Prepare per-asset maps keyed by timestamp (ms)
      const mapBy: Record<string, Map<number, number>> = {};
      for (const sym of universeSymbols) {
        const m = new Map<number, number>();
        const pts = histBy[sym] ?? [];
        for (const p of pts) {
          const t = toEpochMs(p.t);
          if (!t) continue;
          if (!Number.isFinite(p.v)) continue;
          m.set(t, p.v);
        }
        mapBy[sym] = m;
      }

      // Choose a baseline timeline: intersection across selected symbols (or universe if selected empty)
      const basisSymbols = selectedSymbols.length > 0 ? selectedSymbols : universeSymbols;

      let timeline: number[] = [];
      {
        const first = basisSymbols[0];
        timeline = Array.from(mapBy[first].keys()).sort((a, b) => a - b);
        for (let i = 1; i < basisSymbols.length; i++) {
          const sym = basisSymbols[i];
          const s = new Set(mapBy[sym].keys());
          timeline = timeline.filter(t => s.has(t));
        }
        // reduce size if extreme (cap at ~1100 points)
        if (timeline.length > 1100) {
          const step = Math.ceil(timeline.length / 1100);
          timeline = timeline.filter((_, idx) => idx % step === 0);
        }
      }

      if (timeline.length < 20) {
        throw new Error('Insufficient overlapping history for selected assets in timeframe ' + timeframe);
      }

      // Build normalized series for each selected asset on timeline
      const basePrice: Record<string, number> = {};
      const endPrice: Record<string, number> = {};
      for (const sym of universeSymbols) {
        const firstT = timeline[0];
        const lastT = timeline[timeline.length - 1];
        const mp = mapBy[sym];
        basePrice[sym] = mp.get(firstT) ?? NaN;
        endPrice[sym]  = mp.get(lastT) ?? NaN;
      }

      // Portfolio series (indexed to 100)
      const series: BacktestSeriesPoint[] = [];
      const values: number[] = [];

      for (const t of timeline) {
        // Determine which assets are active at this time
        const activeSyms = (strategy === 'score_threshold_cash')
          ? universeSymbols.filter(s => (consensusBySymbol[s] ?? 0) >= clamp(minScore, 0, 100))
          : selectedSymbols;

        if (activeSyms.length === 0) {
          // all cash
          const last = series.length > 0 ? series[series.length - 1].v : 100;
          series.push({ t, v: last });
          values.push(last);
          continue;
        }

        let acc = 0;
        let cnt = 0;
        for (const sym of activeSyms) {
          const bp = basePrice[sym];
          const px = mapBy[sym].get(t);
          if (!Number.isFinite(bp) || !Number.isFinite(px) || bp <= 0) continue;
          acc += (px as number) / bp;
          cnt++;
        }

        const idxVal = cnt > 0 ? (acc / cnt) * 100 : (series.length > 0 ? series[series.length - 1].v : 100);
        series.push({ t, v: idxVal });
        values.push(idxVal);
      }

      // Metrics
      const startV = values[0];
      const endV = values[values.length - 1];
      const totalReturnPct = ((endV - startV) / startV) * 100;

      const msSpan = timeline[timeline.length - 1] - timeline[0];
      const years = msSpan > 0 ? msSpan / (365.25 * 24 * 3600 * 1000) : 0;
      const cagrPct = years > 0 ? (Math.pow(endV / startV, 1 / years) - 1) * 100 : 0;

      const dailyRets: number[] = [];
      for (let i = 1; i < values.length; i++) {
        const r = (values[i] / values[i - 1]) - 1;
        if (Number.isFinite(r)) dailyRets.push(r);
      }
      const volPct = stddev(dailyRets) * Math.sqrt(252) * 100;
      const sharpe = volPct > 0 ? (cagrPct / volPct) : 0;

      const winRatePct = dailyRets.length > 0
        ? (dailyRets.filter(r => r > 0).length / dailyRets.length) * 100
        : 0;

      const mddPct = maxDrawdownPct(values);

      const startStr = new Date(timeline[0]).toISOString().slice(0, 10);
      const endStr   = new Date(timeline[timeline.length - 1]).toISOString().slice(0, 10);

      const assets: BacktestAssetRow[] = universeSymbols.map(sym => {
        const s = STOCKS[sym];
        const bp = basePrice[sym];
        const ep = endPrice[sym];
        const ret = (Number.isFinite(bp) && Number.isFinite(ep) && bp > 0) ? ((ep - bp) / bp) * 100 : 0;
        return {
          symbol: sym,
          name: s?.name ?? sym,
          score: consensusBySymbol[sym] ?? 0,
          startPrice: Number.isFinite(bp) ? bp : 0,
          endPrice: Number.isFinite(ep) ? ep : 0,
          returnPct: ret,
          used: selectedSymbols.includes(sym) || (strategy === 'score_threshold_cash' && (consensusBySymbol[sym] ?? 0) >= clamp(minScore, 0, 100)),
        };
      }).sort((a, b) => (b.used ? 1 : 0) - (a.used ? 1 : 0) || (b.score - a.score));

      const strategyLabel =
        strategy === 'equal_weight' ? 'Equal Weight (Buy & Hold)' :
        strategy === 'top_n_score' ? ('Top ' + clamp(topN, 1, 12) + ' by Rishi Score') :
        ('Score Threshold ≥ ' + clamp(minScore, 0, 100) + ' (Cash Otherwise)');

      const universeLabel =
        universeMode === 'holdings' ? 'Portfolio Holdings' :
        universeMode === 'watchlist' ? 'Watchlist' :
        'Custom List';

      const metrics: BacktestMetrics = {
        totalReturnPct,
        cagrPct,
        volPct,
        sharpe,
        maxDrawdownPct: mddPct,
        winRatePct,
        points: values.length,
        start: startStr,
        end: endStr,
      };

      setResult({
        metrics,
        series,
        assets,
        strategyLabel,
        universeLabel,
        timeframe,
      });

    } catch (e: any) {
      setErr(e?.message ?? 'Backtest failed');
    } finally {
      setRunning(false);
    }
  }

  const chartPath = useMemo(() => result ? buildSparkPath(result.series) : '', [result]);

  const inputStyle: any = {
    padding: '8px 12px',
    background: 'rgba(15,23,42,0.8)',
    border: '1px solid rgba(212,175,55,0.3)',
    borderRadius: 6,
    color: '#E2E8F0',
    fontSize: 13,
    fontFamily: 'monospace',
    width: '100%',
  };

  const btnGold: any = {
    padding: '8px 16px',
    background: 'rgba(212,175,55,0.15)',
    border: '1px solid rgba(212,175,55,0.4)',
    borderRadius: 6,
    color: '#D4AF37',
    fontSize: 12,
    fontFamily: 'monospace',
    cursor: 'pointer',
    letterSpacing: 1,
    whiteSpace: 'nowrap',
  };

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: 12, marginBottom: 16 }}>
        <div style={{ gridColumn: 'span 3' }}>
          <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6, letterSpacing: 1 }}>UNIVERSE</div>
          <select value={universeMode} onChange={e => setUniverseMode(e.target.value as any)} style={inputStyle}>
            <option value="holdings">Holdings</option>
            <option value="watchlist">Watchlist</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div style={{ gridColumn: 'span 3' }}>
          <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6, letterSpacing: 1 }}>STRATEGY</div>
          <select value={strategy} onChange={e => setStrategy(e.target.value as any)} style={inputStyle}>
            <option value="equal_weight">Equal Weight (Buy & Hold)</option>
            <option value="top_n_score">Top N by Rishi Score</option>
            <option value="score_threshold_cash">Score Threshold (Cash Otherwise)</option>
          </select>
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6, letterSpacing: 1 }}>TIMEFRAME</div>
          <select value={timeframe} onChange={e => setTimeframe(e.target.value as any)} style={inputStyle}>
            <option value="3M">3M</option>
            <option value="6M">6M</option>
            <option value="1Y">1Y</option>
            <option value="2Y">2Y</option>
            <option value="5Y">5Y</option>
          </select>
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6, letterSpacing: 1 }}>TOP N</div>
          <input value={topN} onChange={e => setTopN(parseInt(e.target.value || '5', 10))} type="number" min={1} max={12} style={inputStyle} />
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6, letterSpacing: 1 }}>MIN SCORE</div>
          <input value={minScore} onChange={e => setMinScore(parseInt(e.target.value || '65', 10))} type="number" min={0} max={100} style={inputStyle} />
        </div>

        {universeMode === 'custom' && (
          <div style={{ gridColumn: 'span 12' }}>
            <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6, letterSpacing: 1 }}>CUSTOM SYMBOLS (comma/space separated, max 12)</div>
            <textarea value={customSymbols} onChange={e => setCustomSymbols(e.target.value)} rows={2} style={{ ...inputStyle, fontFamily: 'monospace' }} />
          </div>
        )}
      </div>

      {/* Run */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: '#64748B' }}>
          Universe: <span style={{ color: '#94A3B8', fontFamily: 'monospace' }}>{universeSymbols.join(', ') || '—'}</span>
          <span style={{ marginLeft: 12 }} />
          Selected: <span style={{ color: '#94A3B8', fontFamily: 'monospace' }}>{selectedSymbols.join(', ') || 'CASH'}</span>
        </div>

        <button onClick={runBacktest} disabled={running} style={{ ...btnGold, opacity: running ? 0.6 : 1 }}>
          {running ? 'Running…' : 'Run Backtest'}
        </button>
      </div>

      {err && (
        <div style={{ padding: 14, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.06)', borderRadius: 10, color: '#EF4444', marginBottom: 16 }}>
          {err}
        </div>
      )}

      {/* Results */}
      {result && (
        <div>
          <div style={{ marginBottom: 12, fontSize: 12, color: '#64748B' }}>
            <span style={{ color: '#D4AF37', fontFamily: 'monospace', fontWeight: 800 }}>Backtest</span>
            {' '}— {result.universeLabel} — {result.strategyLabel} — {result.timeframe}
            {' '}({result.metrics.start} → {result.metrics.end}, {result.metrics.points} points)
          </div>

          {/* Metrics cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10, marginBottom: 16 }}>
            {[
              { k: 'Total Return', v: fmtPct(result.metrics.totalReturnPct) },
              { k: 'CAGR', v: fmtPct(result.metrics.cagrPct) },
              { k: 'Volatility', v: result.metrics.volPct.toFixed(2) + '%' },
              { k: 'Sharpe', v: result.metrics.sharpe.toFixed(2) },
              { k: 'Max DD', v: result.metrics.maxDrawdownPct.toFixed(2) + '%' },
              { k: 'Win Rate', v: result.metrics.winRatePct.toFixed(2) + '%' },
            ].map(m => (
              <div key={m.k} style={{ padding: 12, border: '1px solid rgba(30,41,59,0.8)', borderRadius: 10, background: 'rgba(15,23,42,0.55)' }}>
                <div style={{ fontSize: 10, color: '#64748B', letterSpacing: 1, marginBottom: 6 }}>{m.k}</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 900, color: '#E2E8F0' }}>{m.v}</div>
              </div>
            ))}
          </div>

          {/* Equity curve */}
          <div style={{ padding: 14, border: '1px solid rgba(30,41,59,0.8)', borderRadius: 12, background: 'rgba(15,23,42,0.45)', marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>Equity Curve (Indexed to 100)</div>
              <div style={{ fontFamily: 'monospace', color: '#64748B' }}>
                End: {result.series[result.series.length - 1].v.toFixed(2)}
              </div>
            </div>
            <svg viewBox="0 0 900 240" width="100%" height="240" preserveAspectRatio="none">
              <path d={chartPath} fill="none" stroke="#D4AF37" strokeWidth="2" />
            </svg>
          </div>

          {/* Assets table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(30,41,59,0.8)' }}>
                  {['Use', 'Symbol', 'Score', 'Start', 'End', 'Return', 'Name'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.assets.map(a => (
                  <tr key={a.symbol} style={{ borderBottom: '1px solid rgba(30,41,59,0.4)', opacity: a.used ? 1 : 0.6 }}>
                    <td style={{ padding: '12px 12px', fontFamily: 'monospace', color: a.used ? '#22C55E' : '#64748B' }}>
                      {a.used ? 'YES' : 'NO'}
                    </td>
                    <td style={{ padding: '12px 12px' }}>
                      <Link href={`/stock/${a.symbol}`} style={{ color: '#D4AF37', textDecoration: 'none', fontFamily: 'monospace', fontWeight: 900 }}>
                        {a.symbol}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 12px', fontFamily: 'monospace', fontWeight: 900, color: scoreColor(a.score) }}>{a.score}</td>
                    <td style={{ padding: '12px 12px', fontFamily: 'monospace', color: '#94A3B8' }}>{fmtNum(a.startPrice)}</td>
                    <td style={{ padding: '12px 12px', fontFamily: 'monospace', color: '#94A3B8' }}>{fmtNum(a.endPrice)}</td>
                    <td style={{ padding: '12px 12px', fontFamily: 'monospace', fontWeight: 900, color: a.returnPct >= 0 ? '#22C55E' : '#EF4444' }}>
                      {fmtPct(a.returnPct)}
                    </td>
                    <td style={{ padding: '12px 12px', color: '#94A3B8' }}>{a.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 10, fontSize: 11, color: '#64748B' }}>
            Notes: This is a lightweight backtest powered by <span style={{ fontFamily: 'monospace' }}>/api/history</span>. It assumes equal-weight allocations and ignores taxes/slippage (to be added next).
          </div>
        </div>
      )}

      {!result && !running && !err && (
        <div style={{ padding: 48, textAlign: 'center', border: '1px dashed rgba(212,175,55,0.2)', borderRadius: 8 }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>↺</div>
          <div style={{ color: '#64748B' }}>
            Configure universe + strategy, then run a backtest. Uses real price history from the platform API.
          </div>
        </div>
      )}
    </div>
  );
}
