'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  MACRO_REGIME,
  MACRO_INDICATORS,
  PHILOSOPHER_STANCES,
  SECTOR_ROTATION,
  HISTORICAL_CORRELATIONS,
  CURRENCY_SENSITIVITY,
  getDailyBrief,
  deriveDynamicAgreement,
} from '../../data/economyPlus/macroData';

type PulseTab =
  | 'overview'
  | 'macro'
  | 'rotation'
  | 'evidence'
  | 'currency'
  | 'brief'
  | 'breadth'
  | 'blocks';

function isValidPulseTab(t: string | null): t is PulseTab {
  return (
    t === 'overview' ||
    t === 'macro' ||
    t === 'rotation' ||
    t === 'evidence' ||
    t === 'currency' ||
    t === 'brief' ||
    t === 'breadth' ||
    t === 'blocks'
  );
}

function StatBox({ label, value, sub, color, onClick }: {
  label: string; value: string; sub?: string; color?: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="stat-unified"
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: color || 'var(--text-primary)' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ emoji, title, color = 'var(--accent-gold)' }: { emoji: string; title: string; color?: string }) {
  return (
    <div className="section-header">
      <h2 className="section-header-title" style={{ color }}>
        <span style={{ marginRight: 10 }}>{emoji}</span>
        {title}
      </h2>
    </div>
  );
}

function safeNum(x: any): number | null {
  const n = typeof x === 'number' ? x : (typeof x === 'string' ? Number(x) : NaN);
  return Number.isFinite(n) ? n : null;
}

function getPct(x: any): number {
  if (!x) return 0;
  if (typeof x.changePercent === 'number') return x.changePercent;
  if (typeof x.percentChange === 'number') return x.percentChange;
  if (typeof x.pChange === 'number') return x.pChange;
  if (typeof x.change === 'number' && typeof x.price === 'number' && x.price !== 0) return (x.change / x.price) * 100;
  return 0;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export default function MarketPulsePage() {
  const [tab, setTab] = useState<PulseTab>('macro');
  const [activeLens, setActiveLens] = useState<'All' | 'Hayek' | 'Friedman' | 'Keynes'>('All');

  const [prices, setPrices] = useState<Record<string, any> | null>(null);
  const [breadth, setBreadth] = useState<any | null>(null);
  const [currencies, setCurrencies] = useState<any[] | null>(null);
  const [blocks, setBlocks] = useState<any | null>(null);

  const [hist30d, setHist30d] = useState<number | null>(null);
  const [liveContext, setLiveContext] = useState<{
    breadthBullish?: number;
    derivativesSignal?: number;
    historicalSpread30d?: number;
    evidenceRecencyHours?: number;
    pricedIn?: boolean;
  } | null>(null);

  // Deep-link tabs via ?tab=
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = new URLSearchParams(window.location.search).get('tab');
    if (isValidPulseTab(t)) setTab(t);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState(null, '', url.toString());
  }, [tab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPop = () => {
      const t = new URLSearchParams(window.location.search).get('tab');
      if (isValidPulseTab(t)) setTab(t);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Persist lens
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('economyPlus.activeLens');
      if (saved === 'All' || saved === 'Hayek' || saved === 'Friedman' || saved === 'Keynes') setActiveLens(saved as any);
    } catch {}
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem('economyPlus.activeLens', activeLens); } catch {}
  }, [activeLens]);

  // Fetch live: prices
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch('/api/prices', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setPrices(data);
      } catch {}
    };
    run();
    const t = setInterval(run, 60000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Fetch live: breadth (NSE)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch('/api/pulse/breadth', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setBreadth(data);
      } catch {}
    };
    run();
    const t = setInterval(run, 60000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Fetch live: currencies (Yahoo)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch('/api/pulse/currency', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setCurrencies(data?.currencies || []);
      } catch {}
    };
    run();
    const t = setInterval(run, 120000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Fetch live: block deals (NSE)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch('/api/pulse/blocks', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setBlocks(data);
      } catch {}
    };
    run();
    const t = setInterval(run, 120000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Fetch hist30d
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch('/api/history/breadth', { cache: 'no-store' });
        if (!res.ok) return;
        const d = await res.json();
        if (!cancelled && typeof d?.breadth30dAvg === 'number') setHist30d(d.breadth30dAvg);
      } catch {}
    };
    run();
    return () => { cancelled = true; };
  }, []);

  // Build live context
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const ad = safeNum(breadth?.breadth?.advanceDeclineRatio);
        const niftyChg = getPct(prices?.['NIFTY50']);
        const goldChg = getPct(prices?.['GOLD']);

        const breadthBullish =
          ad !== null
            ? clamp(50 + ((ad - 1) * 40) + (niftyChg * 3), 0, 100)
            : undefined;

        const derivativesSignal =
          goldChg > 0.5 ? -1 :
          goldChg < -0.5 ? 1 : 0;

        const historicalSpread30d = hist30d ?? undefined;

        let evidenceRecencyHours = 6;
        try {
          const newsRes = await fetch('/api/news', { signal: AbortSignal.timeout(5000) });
          if (newsRes.ok) {
            const newsJson = await newsRes.json();
            if (newsJson?.generatedAt) {
              const diffMs = Date.now() - new Date(newsJson.generatedAt).getTime();
              evidenceRecencyHours = Math.max(0, diffMs / (1000 * 60 * 60));
            }
          }
        } catch {}

        const volComposite = Math.abs(niftyChg) * 0.6 + Math.abs(goldChg) * 0.4;
        const pricedIn = volComposite > 1.3;

        if (!cancelled) {
          setLiveContext({ breadthBullish, derivativesSignal, historicalSpread30d, evidenceRecencyHours, pricedIn });
        }
      } catch {}
    };

    run();
  }, [prices, breadth, hist30d]);

  const mood = useMemo(() => {
    const ad = safeNum(breadth?.breadth?.advanceDeclineRatio);
    const niftyChg = getPct(prices?.['NIFTY50']);

    let score = 50;
    if (ad !== null) score += (ad - 1) * 25;
    score += niftyChg * 10;
    score = clamp(Math.round(score), 0, 100);

    let m = 'NEUTRAL';
    let color = 'var(--amber)';
    let description = 'Mixed signals. Use selective positioning.';

    if (score >= 70) { m = 'BULLISH'; color = 'var(--green)'; description = 'Broad strength and positive momentum.'; }
    else if (score >= 55) { m = 'CAUTIOUSLY BULLISH'; color = '#34D399'; description = 'Positive bias, but stay selective.'; }
    else if (score <= 30) { m = 'BEARISH'; color = 'var(--red)'; description = 'Risk-off conditions. Reduce beta.'; }
    else if (score <= 45) { m = 'CAUTIOUSLY BEARISH'; color = '#FB923C'; description = 'Weak undertone. Prefer defensives.'; }

    return { mood: m, score, color, description };
  }, [breadth, prices]);

  const dynamicStances = useMemo(() => PHILOSOPHER_STANCES.map(ph => ({
    ...ph,
    agreement: deriveDynamicAgreement(
      ph.philosopher,
      MACRO_REGIME.label,
      ph.indicators || [],
      mood.score,
      liveContext ?? undefined
    ),
  })), [mood.score, liveContext]);

  const consensus = useMemo(() => {
    const agreements = dynamicStances.map(s => s.agreement);
    const avgAgreement = Math.round(agreements.reduce((a, b) => a + b, 0) / Math.max(1, agreements.length));
    const spread = Math.max(...agreements) - Math.min(...agreements);
    const label = avgAgreement >= 70 ? 'High Conviction' : avgAgreement >= 55 ? 'Moderate' : 'Low Conviction';
    const color = avgAgreement >= 70 ? 'var(--green)' : avgAgreement >= 55 ? 'var(--amber)' : 'var(--red)';
    return { avgAgreement, spread, label, color };
  }, [dynamicStances]);

  const regime = MACRO_REGIME;
  const brief = getDailyBrief();

  const councilReco =
    consensus.spread >= 55
      ? 'High uncertainty. Avoid leverage, prioritize balance-sheet strength, and size positions conservatively.'
      : consensus.avgAgreement >= 65
      ? 'Consensus tilts constructive. Prefer quality compounders + domestic cyclicals with strong cashflows.'
      : 'Mixed regime. Stay barbell: quality defensives + selective cyclicals. Keep cash for volatility.';

  const tabs: { key: PulseTab; label: string; emoji: string }[] = [
    { key: 'overview', label: 'Overview', emoji: '📊' },
    { key: 'macro', label: 'Macro Regime', emoji: '🧠' },
    { key: 'rotation', label: 'Sector Rotation', emoji: '🔄' },
    { key: 'evidence', label: 'Evidence', emoji: '📚' },
    { key: 'currency', label: 'Currency', emoji: '💱' },
    { key: 'brief', label: 'Daily Brief', emoji: '📰' },
    { key: 'breadth', label: 'Breadth', emoji: '📈' },
    { key: 'blocks', label: 'Block Deals', emoji: '💎' },
  ];

  const live = (k: string) => prices?.[k];
  const priceStr = (k: string, dp = 2) => {
    const p = safeNum(live(k)?.price ?? live(k)?.last ?? live(k)?.regularMarketPrice);
    if (p === null) return '—';
    return dp === 0 ? Math.round(p).toLocaleString() : p.toFixed(dp);
  };
  const pctStr = (k: string) => {
    const p = getPct(live(k));
    if (!Number.isFinite(p)) return '';
    return (p >= 0 ? '+' : '') + p.toFixed(2) + '%';
  };

  return (
    <div className="page-bg">
      {/* HEADER */}
      <div className="page-content" style={{ paddingBottom: 0 }}>
        <Link href="/" className="back-link">← Dashboard</Link>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title" style={{ color: 'var(--accent-gold)' }}>
              🌐 Economy Plus
            </h1>
            <p className="page-subtitle">
              Macro Intelligence · Philosopher Council · Regime Analysis
            </p>
          </div>

          <div className="card-unified" style={{ padding: '16px 24px', minWidth: 160, textAlign: 'center' }}>
            <div className="stat-label">MARKET MOOD</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: mood.color, fontFamily: 'var(--font-serif)', lineHeight: 1 }}>
              {mood.mood}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Score: {mood.score}/100</div>
          </div>
        </div>

        <div className="card-unified" style={{ padding: '12px 18px', marginBottom: 24, borderLeft: `3px solid ${mood.color}` }}>
          <div style={{ fontSize: 13, color: mood.color }}>
            ⚡ {mood.description}
          </div>
        </div>
      </div>

      {/* REGIME BANNER */}
      <div className="page-content" style={{ paddingTop: 0 }}>
        <div className="card-unified" style={{ borderColor: 'var(--border-gold)', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2, fontFamily: 'var(--font-mono)' }}>CURRENT MACRO REGIME</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--accent-gold)', letterSpacing: 2, fontWeight: 700, marginTop: 4 }}>
                {regime.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>{regime.sublabel}</div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2, fontFamily: 'var(--font-mono)' }}>CONSENSUS SCORE</div>
              <div style={{ marginTop: 4, fontSize: 16, fontWeight: 800, color: consensus.color, fontFamily: 'var(--font-mono)' }}>
                {consensus.avgAgreement}/100 · {consensus.label}
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
                Disagreement Index: <span style={{ color: consensus.spread >= 55 ? 'var(--red)' : consensus.spread >= 35 ? 'var(--amber)' : 'var(--green)', fontWeight: 800 }}>{consensus.spread}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, height: 8, background: 'rgba(51,65,85,0.3)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: Math.min(100, Math.max(0, consensus.spread)) + '%', height: '100%', background: consensus.spread >= 55 ? 'var(--red)' : consensus.spread >= 35 ? 'var(--amber)' : 'var(--green)', borderRadius: 999 }} />
          </div>

          <div style={{ marginTop: 14, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>What the Council Recommends:</span> {councilReco}
          </div>
        </div>

        {/* LENS */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1, fontFamily: 'var(--font-mono)' }}>LENS:</span>
          {(['All', 'Hayek', 'Friedman', 'Keynes'] as const).map(lens => (
            <button
              key={lens}
              onClick={() => setActiveLens(lens)}
              className={activeLens === lens ? 'filter-pill active' : 'filter-pill'}
            >
              {lens === 'All' ? '🌐 All' : lens === 'Hayek' ? '🏛️ Hayek' : lens === 'Friedman' ? '📊 Friedman' : '⚙️ Keynes'}
            </button>
          ))}
        </div>

        {/* TAB BAR */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap', overflowX: 'auto' }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={tab === t.key ? 'tab-btn active' : 'tab-btn'}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="page-content" style={{ paddingTop: 0 }}>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
              <StatBox label="NIFTY 50" value={priceStr('NIFTY50', 2)} sub={pctStr('NIFTY50')} color={getPct(live('NIFTY50')) >= 0 ? 'var(--green)' : 'var(--red)'} />
              <StatBox label="SENSEX" value={priceStr('SENSEX', 2)} sub={pctStr('SENSEX')} color={getPct(live('SENSEX')) >= 0 ? 'var(--green)' : 'var(--red)'} />
              <StatBox label="BANK NIFTY" value={priceStr('BANK_NIFTY', 2)} sub={pctStr('BANK_NIFTY')} color={getPct(live('BANK_NIFTY')) >= 0 ? 'var(--green)' : 'var(--red)'} />
              <StatBox label="USD/INR" value={priceStr('USD/INR', 4)} sub={pctStr('USD/INR')} color={getPct(live('USD/INR')) >= 0 ? 'var(--red)' : 'var(--green)'} />
              <StatBox label="GOLD" value={priceStr('GOLD', 2)} sub={pctStr('GOLD')} color={getPct(live('GOLD')) >= 0 ? 'var(--green)' : 'var(--red)'} />
              <StatBox label="BTC" value={priceStr('BTC', 0)} sub={pctStr('BTC')} color={getPct(live('BTC')) >= 0 ? 'var(--green)' : 'var(--red)'} />
              <StatBox
                label="Breadth (A/D)"
                value={breadth?.breadth?.advanceDeclineRatio ? String(breadth.breadth.advanceDeclineRatio) : '—'}
                sub={breadth?.breadth ? `${breadth.breadth.advances} up · ${breadth.breadth.declines} down` : undefined}
                color="var(--amber)"
                onClick={() => setTab('breadth')}
              />
              <StatBox
                label="Block Deals"
                value={blocks?.count ? String(blocks.count) : '—'}
                sub={blocks?.timestamp ? String(blocks.timestamp) : undefined}
                color="var(--accent-gold)"
                onClick={() => setTab('blocks')}
              />
            </div>

            <div className="card-unified">
              <SectionTitle emoji="📈" title="SECTOR SNAPSHOT (NSE INDICES)" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {(breadth?.sectors || []).slice(0, 12).map((s: any) => {
                  const pct = safeNum(s.changePct) ?? 0;
                  const col = pct >= 0 ? 'var(--green)' : 'var(--red)';
                  return (
                    <div key={s.sector} className="card-unified" style={{ padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>{s.sector}</div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: col, fontFamily: 'var(--font-mono)' }}>{(pct >= 0 ? '+' : '') + pct.toFixed(2) + '%'}</div>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        Last: {safeNum(s.last) !== null ? Number(s.last).toFixed(2) : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* MACRO */}
        {tab === 'macro' && (
          <div>
            <div className="card-unified" style={{ borderColor: 'var(--border-gold)', marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 6, fontFamily: 'var(--font-mono)' }}>CURRENT MACRO REGIME</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--accent-gold)', letterSpacing: 2, fontWeight: 700 }}>
                {regime.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{regime.sublabel}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: 14 }}>{regime.description}</div>
              <div style={{ marginTop: 14, fontSize: 11, color: 'var(--text-muted)' }}>
                Historical Analog: {regime.historicalAnalog} ({regime.analogPeriod})
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 24 }}>
              {MACRO_INDICATORS.map(ind => (
                <div key={ind.label} className="card-unified" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>{ind.label}</div>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)',
                      color: ind.signal === 'bullish' ? 'var(--green)' : ind.signal === 'bearish' ? 'var(--red)' : 'var(--amber)'
                    }}>
                      {ind.value}{ind.unit}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{ind.description}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 10, fontFamily: 'var(--font-mono)' }}>
                    As of {ind.asOf} · {ind.trendValue}
                  </div>
                </div>
              ))}
            </div>

            <div className="card-unified">
              <SectionTitle emoji="💱" title="CURRENCY IMPACT — INR SNAPSHOT" color="var(--accent-gold)" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                {(currencies || []).map((c: any) => {
                  const pos = (safeNum(c.changePct) ?? 0) >= 0;
                  const col = pos ? 'var(--red)' : 'var(--green)';
                  const rate = safeNum(c.rate);
                  return (
                    <div key={c.pair} className="card-unified" style={{ padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{c.pair}</div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{rate !== null ? rate.toFixed(4) : '—'}</div>
                      </div>
                      <div style={{ fontSize: 11, color: col, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                        {(safeNum(c.changePct) !== null) ? ((pos ? '+' : '') + Number(c.changePct).toFixed(2) + '%') : '—'}
                        {' '}
                        {(safeNum(c.change) !== null) ? '(' + (pos ? '+' : '') + Number(c.change).toFixed(4) + ')' : ''}
                      </div>
                      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{c.signal || ''}</div>
                      <div style={{ marginTop: 10, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        Trend: {c.trend || '—'} · Vol: {c.volatility || '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ROTATION */}
        {tab === 'rotation' && (
          <div>
            <div className="card-unified" style={{ padding: 18, marginBottom: 24 }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--accent-gold)', letterSpacing: 2, fontWeight: 700, marginBottom: 12 }}>
                🔄 SECTOR ROTATION OUTLOOK
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Scores are regime-based (updated when macro view is updated). Live market data is shown in Overview/Breadth/Currency/Blocks tabs.
              </div>
            </div>

            <div className="card-unified" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="table-sacred" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 140 }}>SECTOR</th>
                      <th style={{ textAlign: 'center' }}>🏛️ HAYEK</th>
                      <th style={{ textAlign: 'center' }}>📊 FRIEDMAN</th>
                      <th style={{ textAlign: 'center' }}>⚙️ KEYNES</th>
                      <th style={{ textAlign: 'center' }}>CONSENSUS</th>
                      <th style={{ textAlign: 'center' }}>SPREAD</th>
                      <th style={{ textAlign: 'center' }}>BIAS</th>
                      <th style={{ minWidth: 180 }}>KEY MACRO DRIVER</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SECTOR_ROTATION.map((s, i) => {
                      const spreadCol = s.spread >= 50 ? 'var(--red)' : s.spread >= 30 ? 'var(--amber)' : 'var(--green)';
                      const scoreCell = (score: number) => {
                        const bg = score >= 70 ? 'rgba(34,197,94,0.1)' : score >= 55 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)';
                        const fg = score >= 70 ? 'var(--green)' : score >= 55 ? 'var(--amber)' : 'var(--red)';
                        return { bg, fg };
                      };
                      const hc = scoreCell(s.hayek.score);
                      const fc = scoreCell(s.friedman.score);
                      const kc = scoreCell(s.keynes.score);
                      const cc = scoreCell(s.consensus);

                      return (
                        <tr key={s.sector}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 16 }}>{s.icon}</span>
                              <span style={{ fontWeight: 700 }}>{s.sector}</span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', background: hc.bg }}>
                            <div style={{ fontWeight: 800, color: hc.fg, fontFamily: 'var(--font-mono)' }}>{s.hayek.score}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{s.hayek.stance}</div>
                          </td>
                          <td style={{ textAlign: 'center', background: fc.bg }}>
                            <div style={{ fontWeight: 800, color: fc.fg, fontFamily: 'var(--font-mono)' }}>{s.friedman.score}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{s.friedman.stance}</div>
                          </td>
                          <td style={{ textAlign: 'center', background: kc.bg }}>
                            <div style={{ fontWeight: 800, color: kc.fg, fontFamily: 'var(--font-mono)' }}>{s.keynes.score}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{s.keynes.stance}</div>
                          </td>
                          <td style={{ textAlign: 'center', background: cc.bg }}>
                            <div style={{ fontWeight: 800, color: cc.fg, fontSize: 16, fontFamily: 'var(--font-mono)' }}>{s.consensus}</div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ color: spreadCol, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{s.spread}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="badge" style={{
                              background: s.biasColor + '20',
                              borderColor: s.biasColor + '50',
                              color: s.biasColor,
                              fontSize: 10
                            }}>
                              {s.forwardBias}
                            </span>
                          </td>
                          <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.keyMacroDriver}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* EVIDENCE, CURRENCY, BRIEF, BREADTH, BLOCKS — Keep original inline styles but within new container */}
        {tab === 'evidence' && (
          <div>
            <div style={{ background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 16, padding: 18, marginBottom: 24 }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--accent-gold)', letterSpacing: 2, fontWeight: 700, marginBottom: 10 }}>
                📚 HISTORICAL EVIDENCE ENGINE
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Evidence cards: macro condition → historical outcome. Filtered by lens.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              {HISTORICAL_CORRELATIONS
                .filter(c => activeLens === 'All' || c.philosopher === activeLens || c.philosopher === 'All')
                .map(c => (
                  <div key={c.id} style={{ background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(30,41,59,0.8)', borderRadius: 16, padding: 20, position: 'relative' }}>
                    {c.regimeMatch && (
                      <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 9, color: 'var(--green)', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', padding: '4px 10px', borderRadius: 999, fontWeight: 700 }}>
                        ✓ CURRENT REGIME MATCH
                      </div>
                    )}

                    <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 700, lineHeight: 1.4, marginBottom: 14, paddingRight: 100 }}>
                      {c.title}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                      <div style={{ background: 'rgba(31,41,59,0.6)', border: '1px solid rgba(51,65,85,0.5)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>WIN RATE</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: c.winRate >= 75 ? 'var(--green)' : c.winRate >= 60 ? 'var(--amber)' : 'var(--red)' }}>
                          {c.winRate}%
                        </div>
                      </div>
                      <div style={{ background: 'rgba(31,41,59,0.6)', border: '1px solid rgba(51,65,85,0.5)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>AVG</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent-gold)' }}>{c.avgReturn}</div>
                      </div>
                      <div style={{ background: 'rgba(31,41,59,0.6)', border: '1px solid rgba(51,65,85,0.5)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>N</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)' }}>{c.instances}</div>
                      </div>
                    </div>

                    <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 8 }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>Condition: </span>{c.condition}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 12 }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>Outcome: </span>{c.outcome}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 9, color: c.confidenceColor, background: c.confidenceColor + '15', border: '1px solid ' + c.confidenceColor + '30', padding: '4px 10px', borderRadius: 999, fontWeight: 700 }}>
                        {c.confidence} Confidence
                      </span>
                      <span style={{ fontSize: 9, color: c.philosopherColor }}>
                        {c.philosopher}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {tab === 'currency' && (
          <div>
            <div style={{ background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 16, padding: 18, marginBottom: 24 }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--accent-gold)', letterSpacing: 2, fontWeight: 700, marginBottom: 10 }}>
                💱 CURRENCY SENSITIVITY MATRIX
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Estimated earnings sensitivity per 1% INR move (heuristic).
              </div>
            </div>

            <div style={{ background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(30,41,59,0.8)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="table-sacred" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>SECTOR</th>
                      <th style={{ textAlign: 'center' }}>REV</th>
                      <th style={{ textAlign: 'center' }}>COST</th>
                      <th style={{ textAlign: 'center', color: 'var(--green)' }}>INR WEAK +1%</th>
                      <th style={{ textAlign: 'center', color: 'var(--red)' }}>INR STRONG +1%</th>
                      <th style={{ textAlign: 'center' }}>BIAS</th>
                      <th>EXAMPLES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CURRENCY_SENSITIVITY.map((s, i) => (
                      <tr key={s.sector}>
                        <td>
                          <span style={{ fontSize: 16 }}>{s.icon}</span>
                          <span style={{ fontWeight: 700, marginLeft: 8 }}>{s.sector}</span>
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 11 }}>{s.revenueExposure}</td>
                        <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 11 }}>{s.costExposure}</td>
                        <td style={{ textAlign: 'center', fontWeight: 900, color: s.inrDepreciation1pct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {(s.inrDepreciation1pct >= 0 ? '+' : '') + s.inrDepreciation1pct.toFixed(1) + '%'}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 900, color: s.inrAppreciation1pct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {(s.inrAppreciation1pct >= 0 ? '+' : '') + s.inrAppreciation1pct.toFixed(1) + '%'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: 10, color: s.biasColor, background: s.biasColor + '18', border: '1px solid ' + s.biasColor + '40', padding: '5px 12px', borderRadius: 999, fontWeight: 700 }}>
                            {s.netBias}
                          </span>
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.examples.join(' · ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === 'brief' && (
          <div>
            <div style={{ background: 'linear-gradient(135deg, rgba(17,24,39,0.9), rgba(10,15,28,0.95))', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 16, padding: 26, marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 6 }}>{brief.date}</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--accent-gold)', letterSpacing: 2, fontWeight: 700, marginBottom: 10 }}>
                📰 {brief.headline}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1 }}>{brief.regimeLabel}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {brief.sections
                .filter(s => activeLens === 'All' || !s.philosopher || s.philosopher === activeLens)
                .map((s, i) => (
                  <div key={i} style={{ background: 'rgba(17,24,39,0.85)', border: '1px solid ' + (s.philosopherColor ? s.philosopherColor + '30' : 'rgba(30,41,59,0.8)'), borderLeft: '3px solid ' + (s.philosopherColor || 'var(--accent-gold)'), borderRadius: 12, padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <span style={{ fontSize: 20 }}>{s.icon}</span>
                      <div style={{ fontWeight: 700, color: s.philosopherColor || 'var(--accent-gold)', fontSize: 13 }}>{s.title}</div>
                      {s.philosopher && (
                        <span style={{ marginLeft: 'auto', fontSize: 9, color: s.philosopherColor, background: s.philosopherColor + '15', border: '1px solid ' + s.philosopherColor + '30', padding: '4px 10px', borderRadius: 999 }}>
                          {s.philosopher}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>{s.content}</div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {tab === 'breadth' && (
          <div>
            <div className="card-unified" style={{ padding: 20, marginBottom: 24 }}>
              <SectionTitle emoji="📈" title="BREADTH (NSE INDICES SNAPSHOT)" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                <StatBox label="Advancing" value={breadth?.breadth ? String(breadth.breadth.advances) : '—'} color="var(--green)" />
                <StatBox label="Declining" value={breadth?.breadth ? String(breadth.breadth.declines) : '—'} color="var(--red)" />
                <StatBox label="Unchanged" value={breadth?.breadth ? String(breadth.breadth.unchanged) : '—'} color="#818CF8" />
                <StatBox label="A/D Ratio" value={breadth?.breadth?.advanceDeclineRatio ? String(breadth.breadth.advanceDeclineRatio) : '—'} color="var(--amber)" />
              </div>
            </div>

            <div className="card-unified" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(30,41,59,0.8)' }}>
                <SectionTitle emoji="📊" title="SECTOR INDEX MOVES (LIVE)" />
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="table-sacred" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      {['Sector','Last','% Chg','High','Low','Open','Prev Close'].map(h => (
                        <th key={h} style={{ textAlign: h === 'Sector' ? 'left' : 'right' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(breadth?.sectors || []).map((s: any, i: number) => {
                      const pct = safeNum(s.changePct) ?? 0;
                      const col = pct >= 0 ? 'var(--green)' : 'var(--red)';
                      return (
                        <tr key={s.sector}>
                          <td style={{ fontWeight: 600 }}>{s.sector}</td>
                          <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{safeNum(s.last) !== null ? Number(s.last).toFixed(2) : '—'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: col }}>{(pct >= 0 ? '+' : '') + pct.toFixed(2) + '%'}</td>
                          <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{safeNum(s.high) !== null ? Number(s.high).toFixed(2) : '—'}</td>
                          <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{safeNum(s.low) !== null ? Number(s.low).toFixed(2) : '—'}</td>
                          <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{safeNum(s.open) !== null ? Number(s.open).toFixed(2) : '—'}</td>
                          <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{safeNum(s.prevClose) !== null ? Number(s.prevClose).toFixed(2) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === 'blocks' && (
          <div>
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '12px 18px', marginBottom: 22, fontSize: 12, color: 'var(--amber)' }}>
              💎 Live NSE block deal feed.
            </div>

            <div className="card-unified" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="table-sacred" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      {['Symbol','Qty','Price','Value (Cr)','Chg %','Side','Series'].map(h => (
                        <th key={h} style={{ textAlign: h === 'Symbol' ? 'left' : 'right' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(blocks?.deals || []).map((d: any, i: number) => {
                      const pct = safeNum(d.changePct) ?? 0;
                      const col = pct >= 0 ? 'var(--green)' : 'var(--red)';
                      return (
                        <tr key={d.symbol + '-' + i}>
                          <td style={{ color: 'var(--amber)', fontWeight: 700 }}>{d.symbol}</td>
                          <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{safeNum(d.quantity) !== null ? Number(d.quantity).toLocaleString() : '—'}</td>
                          <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{safeNum(d.price) !== null ? Number(d.price).toFixed(2) : '—'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-gold)' }}>{safeNum(d.value) !== null ? Number(d.value).toFixed(2) : '—'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: col }}>{(pct >= 0 ? '+' : '') + pct.toFixed(2) + '%'}</td>
                          <td style={{ textAlign: 'right' }}>
                            <span style={{
                              background: d.side === 'BUY' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                              border: '1px solid ' + (d.side === 'BUY' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'),
                              color: d.side === 'BUY' ? 'var(--green)' : 'var(--red)',
                              borderRadius: 6,
                              padding: '4px 12px',
                              fontSize: 10,
                              fontWeight: 700
                            }}>
                              {d.side}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{d.series || ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* FOOTER */}
      <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, marginTop: 40, paddingTop: 20, borderTop: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>
        NOT INVESTMENT ADVICE · EDUCATIONAL SIMULATION · RISHI TERMINAL
      </div>
    </div>
  );
}