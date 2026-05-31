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
      style={{
        background: '#09090F',
        border: '1px solid #1E293B',
        borderRadius: 10,
        padding: '14px 16px',
        textAlign: 'center',
        cursor: onClick ? 'pointer' : 'default'
      }}
    >
      <div style={{ fontSize: 8, color: '#475569', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || '#F1F5F9', fontFamily: 'JetBrains Mono, monospace' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 9, color: '#334155', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ emoji, title, color = '#F59E0B' }: { emoji: string; title: string; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid #1E293B' }}>
      <span style={{ fontSize: 18 }}>{emoji}</span>
      <span style={{ fontFamily: 'Cinzel, Georgia', fontSize: 15, color, letterSpacing: 2, fontWeight: 700 }}>{title}</span>
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

  // Fetch hist30d (already live endpoint)
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

  // Build live context for agreement scoring (no fake FII/DII)
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
    let color = '#F59E0B';
    let description = 'Mixed signals. Use selective positioning.';

    if (score >= 70) { m = 'BULLISH'; color = '#10B981'; description = 'Broad strength and positive momentum.'; }
    else if (score >= 55) { m = 'CAUTIOUSLY BULLISH'; color = '#34D399'; description = 'Positive bias, but stay selective.'; }
    else if (score <= 30) { m = 'BEARISH'; color = '#EF4444'; description = 'Risk-off conditions. Reduce beta.'; }
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
    const color = avgAgreement >= 70 ? '#10B981' : avgAgreement >= 55 ? '#F59E0B' : '#EF4444';
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
    <div style={{ fontFamily: 'JetBrains Mono, monospace', background: '#050508', color: '#E2E8F0', minHeight: '100vh', padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap" />

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Link href="/" style={{ color: '#F59E0B', textDecoration: 'none', fontSize: 11, display: 'block', marginBottom: 8 }}>← Dashboard</Link>
          <div style={{ fontFamily: 'Cinzel, Georgia', fontSize: 20, color: '#F59E0B', letterSpacing: 3, fontWeight: 700 }}>🌐 ECONOMY PLUS</div>
          <div style={{ fontSize: 9, color: '#334155', letterSpacing: 2, marginTop: 3 }}>MACRO INTELLIGENCE · PHILOSOPHER COUNCIL · REGIME ANALYSIS</div>
        </div>

        <div style={{ background: mood.color + '15', border: '1px solid ' + mood.color + '40', borderRadius: 10, padding: '12px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#475569', letterSpacing: 2, marginBottom: 4 }}>MARKET MOOD</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: mood.color, fontFamily: 'Cinzel, Georgia' }}>{mood.mood}</div>
          <div style={{ fontSize: 9, color: '#475569', marginTop: 4 }}>Score: {mood.score}/100</div>
        </div>
      </div>

      <div style={{ background: mood.color + '10', border: '1px solid ' + mood.color + '25', borderRadius: 8, padding: '10px 16px', marginBottom: 24, fontSize: 11, color: mood.color }}>
        ⚡ {mood.description}
      </div>

      {/* REGIME BANNER */}
      <div style={{ background: '#09090F', border: '1px solid #D4AF37', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 9, color: '#64748B', letterSpacing: 2 }}>CURRENT MACRO REGIME</div>
            <div style={{ fontFamily: 'Cinzel, Georgia', fontSize: 16, color: '#D4AF37', letterSpacing: 2, fontWeight: 700, marginTop: 4 }}>
              {regime.label}
            </div>
            <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 6 }}>{regime.sublabel}</div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: '#64748B', letterSpacing: 2 }}>CONSENSUS SCORE</div>
            <div style={{ marginTop: 4, fontSize: 14, fontWeight: 800, color: consensus.color }}>
              {consensus.avgAgreement}/100 · {consensus.label}
            </div>
            <div style={{ marginTop: 6, fontSize: 10, color: '#94A3B8' }}>
              Disagreement Index: <span style={{ color: consensus.spread >= 55 ? '#EF4444' : consensus.spread >= 35 ? '#F59E0B' : '#10B981', fontWeight: 800 }}>{consensus.spread}</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, height: 6, background: '#1E293B', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: Math.min(100, Math.max(0, consensus.spread)) + '%', height: '100%', background: consensus.spread >= 55 ? '#EF4444' : consensus.spread >= 35 ? '#F59E0B' : '#10B981' }} />
        </div>

        <div style={{ marginTop: 12, fontSize: 11, color: '#CBD5E1', lineHeight: 1.6 }}>
          <span style={{ color: '#D4AF37', fontWeight: 800 }}>What the Council Recommends:</span> {councilReco}
        </div>
      </div>

      {/* LENS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: '#475569', letterSpacing: 1 }}>LENS:</span>
        {(['All', 'Hayek', 'Friedman', 'Keynes'] as const).map(lens => (
          <button
            key={lens}
            onClick={() => setActiveLens(lens)}
            style={{
              padding: '5px 14px',
              borderRadius: 999,
              cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              fontWeight: 700,
              background: activeLens === lens ? '#D4AF37' : '#09090F',
              color: activeLens === lens ? '#050508' : '#475569',
              border: activeLens === lens ? '1px solid #D4AF37' : '1px solid #1E293B'
            }}
          >
            {lens === 'All' ? '🌐 All' : lens === 'Hayek' ? '🏛️ Hayek' : lens === 'Friedman' ? '📊 Friedman' : '⚙️ Keynes'}
          </button>
        ))}
      </div>

      {/* TAB BAR */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px',
              background: tab === t.key ? '#F59E0B15' : '#09090F',
              border: tab === t.key ? '1px solid #F59E0B' : '1px solid #1E293B',
              borderRadius: 8,
              color: tab === t.key ? '#F59E0B' : '#475569',
              cursor: 'pointer',
              fontSize: 11,
              fontFamily: 'JetBrains Mono, monospace',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 24 }}>
            <StatBox label="NIFTY 50" value={priceStr('NIFTY50', 2)} sub={pctStr('NIFTY50')} color={getPct(live('NIFTY50')) >= 0 ? '#10B981' : '#EF4444'} />
            <StatBox label="SENSEX" value={priceStr('SENSEX', 2)} sub={pctStr('SENSEX')} color={getPct(live('SENSEX')) >= 0 ? '#10B981' : '#EF4444'} />
            <StatBox label="BANK NIFTY" value={priceStr('BANK_NIFTY', 2)} sub={pctStr('BANK_NIFTY')} color={getPct(live('BANK_NIFTY')) >= 0 ? '#10B981' : '#EF4444'} />
            <StatBox label="USD/INR" value={priceStr('USD/INR', 4)} sub={pctStr('USD/INR')} color={getPct(live('USD/INR')) >= 0 ? '#EF4444' : '#10B981'} />
            <StatBox label="GOLD" value={priceStr('GOLD', 2)} sub={pctStr('GOLD')} color={getPct(live('GOLD')) >= 0 ? '#10B981' : '#EF4444'} />
            <StatBox label="BTC" value={priceStr('BTC', 0)} sub={pctStr('BTC')} color={getPct(live('BTC')) >= 0 ? '#10B981' : '#EF4444'} />

            <StatBox
              label="Breadth (A/D)"
              value={breadth?.breadth?.advanceDeclineRatio ? String(breadth.breadth.advanceDeclineRatio) : '—'}
              sub={breadth?.breadth ? `${breadth.breadth.advances} up · ${breadth.breadth.declines} down` : undefined}
              color="#F59E0B"
              onClick={() => setTab('breadth')}
            />
            <StatBox
              label="Block Deals"
              value={blocks?.count ? String(blocks.count) : '—'}
              sub={blocks?.timestamp ? String(blocks.timestamp) : undefined}
              color="#D4AF37"
              onClick={() => setTab('blocks')}
            />
          </div>

          <div style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 12, padding: 20 }}>
            <SectionTitle emoji="📈" title="SECTOR SNAPSHOT (NSE INDICES)" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
              {(breadth?.sectors || []).slice(0, 12).map((s: any) => {
                const pct = safeNum(s.changePct) ?? 0;
                const col = pct >= 0 ? '#10B981' : '#EF4444';
                return (
                  <div key={s.sector} style={{ background: '#050508', border: '1px solid #1E293B', borderRadius: 10, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#F1F5F9' }}>{s.sector}</div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: col }}>{(pct >= 0 ? '+' : '') + pct.toFixed(2) + '%'}</div>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 10, color: '#94A3B8' }}>
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
          <div style={{ background: '#09090F', border: '1px solid #D4AF37', borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <div style={{ fontSize: 10, color: '#475569', letterSpacing: 2, marginBottom: 6 }}>CURRENT MACRO REGIME</div>
            <div style={{ fontFamily: 'Cinzel, Georgia', fontSize: 18, color: '#D4AF37', letterSpacing: 2, fontWeight: 700 }}>
              {regime.label}
            </div>
            <div style={{ fontSize: 10, color: '#64748B', marginTop: 6 }}>{regime.sublabel}</div>
            <div style={{ fontSize: 11, color: '#CBD5E1', lineHeight: 1.7, marginTop: 12 }}>{regime.description}</div>
            <div style={{ marginTop: 12, fontSize: 10, color: '#475569' }}>
              Historical Analog: {regime.historicalAnalog} ({regime.analogPeriod})
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginBottom: 24 }}>
            {MACRO_INDICATORS.map(ind => (
              <div key={ind.label} style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontSize: 10, color: '#64748B', letterSpacing: 1, textTransform: 'uppercase' }}>{ind.label}</div>
                  <div style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: ind.signal === 'bullish' ? '#10B981' : ind.signal === 'bearish' ? '#EF4444' : '#F59E0B'
                  }}>
                    {ind.value}{ind.unit}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: '#94A3B8', lineHeight: 1.6, marginTop: 8 }}>{ind.description}</div>
                <div style={{ fontSize: 9, color: '#475569', marginTop: 10 }}>
                  As of {ind.asOf} · {ind.trendValue}
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 12, padding: 20 }}>
            <SectionTitle emoji="💱" title="CURRENCY IMPACT — INR SNAPSHOT" color="#D4AF37" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              {(currencies || []).map((c: any) => {
                const pos = (safeNum(c.changePct) ?? 0) >= 0;
                const col = pos ? '#EF4444' : '#10B981';
                const rate = safeNum(c.rate);
                return (
                  <div key={c.pair} style={{ background: '#050508', border: '1px solid #1E293B', borderRadius: 10, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 900, color: '#F1F5F9' }}>{c.pair}</div>
                      <div style={{ fontSize: 12, fontWeight: 900, color: '#F1F5F9' }}>{rate !== null ? rate.toFixed(4) : '—'}</div>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 10, color: col, fontWeight: 800 }}>
                      {(safeNum(c.changePct) !== null) ? ((pos ? '+' : '') + Number(c.changePct).toFixed(2) + '%') : '—'}
                      {' '}
                      {(safeNum(c.change) !== null) ? '(' + (pos ? '+' : '') + Number(c.change).toFixed(4) + ')' : ''}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 10, color: '#94A3B8', lineHeight: 1.6 }}>{c.signal || ''}</div>
                    <div style={{ marginTop: 10, fontSize: 9, color: '#475569' }}>
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
          <div style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <div style={{ fontFamily: 'Cinzel, Georgia', fontSize: 14, color: '#D4AF37', letterSpacing: 2, fontWeight: 700, marginBottom: 12 }}>
              🔄 SECTOR ROTATION OUTLOOK
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.6 }}>
              Scores are regime-based (updated when macro view is updated). Live market data is shown in Overview/Breadth/Currency/Blocks tabs.
            </div>
          </div>

          <div style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#06060D' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontSize: 9, letterSpacing: 1, minWidth: 140 }}>SECTOR</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: '#818CF8', fontSize: 9, letterSpacing: 1 }}>🏛️ HAYEK</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: '#34D399', fontSize: 9, letterSpacing: 1 }}>📊 FRIEDMAN</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: '#FB923C', fontSize: 9, letterSpacing: 1 }}>⚙️ KEYNES</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: '#D4AF37', fontSize: 9, letterSpacing: 1 }}>CONSENSUS</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: '#475569', fontSize: 9, letterSpacing: 1 }}>SPREAD</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: '#475569', fontSize: 9, letterSpacing: 1 }}>BIAS</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontSize: 9, letterSpacing: 1, minWidth: 180 }}>KEY MACRO DRIVER</th>
                  </tr>
                </thead>
                <tbody>
                  {SECTOR_ROTATION.map((s, i) => {
                    const spreadCol = s.spread >= 50 ? '#EF4444' : s.spread >= 30 ? '#F59E0B' : '#10B981';
                    const scoreCell = (score: number) => {
                      const bg = score >= 70 ? '#10B98120' : score >= 55 ? '#F59E0B15' : '#EF444415';
                      const fg = score >= 70 ? '#10B981' : score >= 55 ? '#F59E0B' : '#EF4444';
                      return { bg, fg };
                    };
                    const hc = scoreCell(s.hayek.score);
                    const fc = scoreCell(s.friedman.score);
                    const kc = scoreCell(s.keynes.score);
                    const cc = scoreCell(s.consensus);

                    return (
                      <tr key={s.sector} style={{ borderBottom: '1px solid #0F172A', background: i % 2 === 0 ? '#09090F' : '#070710' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 16 }}>{s.icon}</span>
                            <span style={{ color: '#F1F5F9', fontWeight: 700 }}>{s.sector}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', background: hc.bg }}>
                          <div style={{ fontWeight: 800, color: hc.fg }}>{s.hayek.score}</div>
                          <div style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>{s.hayek.stance}</div>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', background: fc.bg }}>
                          <div style={{ fontWeight: 800, color: fc.fg }}>{s.friedman.score}</div>
                          <div style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>{s.friedman.stance}</div>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', background: kc.bg }}>
                          <div style={{ fontWeight: 800, color: kc.fg }}>{s.keynes.score}</div>
                          <div style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>{s.keynes.stance}</div>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', background: cc.bg }}>
                          <div style={{ fontWeight: 800, color: cc.fg, fontSize: 15 }}>{s.consensus}</div>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{ color: spreadCol, fontWeight: 700 }}>{s.spread}</span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{
                            background: s.biasColor + '20',
                            border: '1px solid ' + s.biasColor + '50',
                            color: s.biasColor,
                            padding: '4px 10px',
                            borderRadius: 999,
                            fontSize: 10,
                            fontWeight: 700,
                            whiteSpace: 'nowrap'
                          }}>
                            {s.forwardBias}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748B', fontSize: 10 }}>{s.keyMacroDriver}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EVIDENCE */}
      {tab === 'evidence' && (
        <div>
          <div style={{ background: '#09090F', border: '1px solid #D4AF37', borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <div style={{ fontFamily: 'Cinzel, Georgia', fontSize: 14, color: '#D4AF37', letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>
              📚 HISTORICAL EVIDENCE ENGINE
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.6 }}>
              Evidence cards: macro condition → historical outcome. Filtered by lens.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
            {HISTORICAL_CORRELATIONS
              .filter(c => activeLens === 'All' || c.philosopher === activeLens || c.philosopher === 'All')
              .map(c => (
                <div key={c.id} style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 12, padding: 18, position: 'relative' }}>
                  {c.regimeMatch && (
                    <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 9, color: '#10B981', background: '#10B98115', border: '1px solid #10B98130', padding: '3px 8px', borderRadius: 999, fontWeight: 700 }}>
                      ✓ CURRENT REGIME MATCH
                    </div>
                  )}

                  <div style={{ fontSize: 12, color: '#F1F5F9', fontWeight: 700, lineHeight: 1.4, marginBottom: 12, paddingRight: 100 }}>
                    {c.title}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <div style={{ background: '#050508', border: '1px solid #1E293B', borderRadius: 10, padding: 10, textAlign: 'center' }}>
                      <div style={{ fontSize: 9, color: '#475569' }}>WIN RATE</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: c.winRate >= 75 ? '#10B981' : c.winRate >= 60 ? '#F59E0B' : '#EF4444' }}>
                        {c.winRate}%
                      </div>
                    </div>
                    <div style={{ background: '#050508', border: '1px solid #1E293B', borderRadius: 10, padding: 10, textAlign: 'center' }}>
                      <div style={{ fontSize: 9, color: '#475569' }}>AVG</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#D4AF37' }}>{c.avgReturn}</div>
                    </div>
                    <div style={{ background: '#050508', border: '1px solid #1E293B', borderRadius: 10, padding: 10, textAlign: 'center' }}>
                      <div style={{ fontSize: 9, color: '#475569' }}>N</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#F1F5F9' }}>{c.instances}</div>
                    </div>
                  </div>

                  <div style={{ fontSize: 10, color: '#64748B', lineHeight: 1.6, marginBottom: 8 }}>
                    <span style={{ color: '#94A3B8', fontWeight: 700 }}>Condition: </span>{c.condition}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748B', lineHeight: 1.6, marginBottom: 10 }}>
                    <span style={{ color: '#94A3B8', fontWeight: 700 }}>Outcome: </span>{c.outcome}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 9, color: c.confidenceColor, background: c.confidenceColor + '15', border: '1px solid ' + c.confidenceColor + '30', padding: '3px 8px', borderRadius: 999, fontWeight: 700 }}>
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

      {/* CURRENCY TAB (sensitivity matrix is structural; live rates shown in Macro tab) */}
      {tab === 'currency' && (
        <div>
          <div style={{ background: '#09090F', border: '1px solid #D4AF37', borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <div style={{ fontFamily: 'Cinzel, Georgia', fontSize: 14, color: '#D4AF37', letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>
              💱 CURRENCY SENSITIVITY MATRIX
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.6 }}>
              Estimated earnings sensitivity per 1% INR move (heuristic).
            </div>
          </div>

          <div style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#06060D' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontSize: 9, letterSpacing: 1 }}>SECTOR</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: '#475569', fontSize: 9, letterSpacing: 1 }}>REV</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: '#475569', fontSize: 9, letterSpacing: 1 }}>COST</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: '#10B981', fontSize: 9, letterSpacing: 1 }}>INR WEAK +1%</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: '#EF4444', fontSize: 9, letterSpacing: 1 }}>INR STRONG +1%</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: '#475569', fontSize: 9, letterSpacing: 1 }}>BIAS</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontSize: 9, letterSpacing: 1 }}>EXAMPLES</th>
                  </tr>
                </thead>
                <tbody>
                  {CURRENCY_SENSITIVITY.map((s, i) => (
                    <tr key={s.sector} style={{ borderBottom: '1px solid #0F172A', background: i % 2 === 0 ? '#09090F' : '#070710' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 16 }}>{s.icon}</span>
                        <span style={{ color: '#F1F5F9', fontWeight: 700, marginLeft: 8 }}>{s.sector}</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 10 }}>{s.revenueExposure}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 10 }}>{s.costExposure}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 900, color: s.inrDepreciation1pct >= 0 ? '#10B981' : '#EF4444' }}>
                        {(s.inrDepreciation1pct >= 0 ? '+' : '') + s.inrDepreciation1pct.toFixed(1) + '%'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 900, color: s.inrAppreciation1pct >= 0 ? '#10B981' : '#EF4444' }}>
                        {(s.inrAppreciation1pct >= 0 ? '+' : '') + s.inrAppreciation1pct.toFixed(1) + '%'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{ fontSize: 9, color: s.biasColor, background: s.biasColor + '18', border: '1px solid ' + s.biasColor + '40', padding: '4px 10px', borderRadius: 999, fontWeight: 700 }}>
                          {s.netBias}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569', fontSize: 10 }}>{s.examples.join(' · ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DAILY BRIEF */}
      {tab === 'brief' && (
        <div>
          <div style={{ background: 'linear-gradient(135deg, #0A0F1C, #050508)', border: '1px solid #D4AF37', borderRadius: 12, padding: 24, marginBottom: 24 }}>
            <div style={{ fontSize: 10, color: '#64748B', letterSpacing: 2, marginBottom: 4 }}>{brief.date}</div>
            <div style={{ fontFamily: 'Cinzel, Georgia', fontSize: 20, color: '#D4AF37', letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>
              📰 {brief.headline}
            </div>
            <div style={{ fontSize: 10, color: '#475569', letterSpacing: 1 }}>{brief.regimeLabel}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {brief.sections
              .filter(s => activeLens === 'All' || !s.philosopher || s.philosopher === activeLens)
              .map((s, i) => (
                <div key={i} style={{ background: '#09090F', border: '1px solid ' + (s.philosopherColor ? s.philosopherColor + '30' : '#1E293B'), borderLeft: '3px solid ' + (s.philosopherColor || '#D4AF37'), borderRadius: 10, padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 18 }}>{s.icon}</span>
                    <div style={{ fontWeight: 700, color: s.philosopherColor || '#D4AF37', fontSize: 12 }}>{s.title}</div>
                    {s.philosopher && (
                      <span style={{ marginLeft: 'auto', fontSize: 9, color: s.philosopherColor, background: s.philosopherColor + '15', border: '1px solid ' + s.philosopherColor + '30', padding: '3px 8px', borderRadius: 999 }}>
                        {s.philosopher}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#CBD5E1', lineHeight: 1.8 }}>{s.content}</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* BREADTH */}
      {tab === 'breadth' && (
        <div>
          <div style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <SectionTitle emoji="📈" title="BREADTH (NSE INDICES SNAPSHOT)" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              <StatBox label="Advancing" value={breadth?.breadth ? String(breadth.breadth.advances) : '—'} color="#10B981" />
              <StatBox label="Declining" value={breadth?.breadth ? String(breadth.breadth.declines) : '—'} color="#EF4444" />
              <StatBox label="Unchanged" value={breadth?.breadth ? String(breadth.breadth.unchanged) : '—'} color="#818CF8" />
              <StatBox label="A/D Ratio" value={breadth?.breadth?.advanceDeclineRatio ? String(breadth.breadth.advanceDeclineRatio) : '—'} color="#F59E0B" />
            </div>
          </div>

          <div style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #1E293B' }}>
              <SectionTitle emoji="📊" title="SECTOR INDEX MOVES (LIVE)" />
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#06060D' }}>
                    {['Sector','Last','% Chg','High','Low','Open','Prev Close'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', color: '#475569', fontSize: 9, textAlign: h === 'Sector' ? 'left' : 'right', letterSpacing: 1 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(breadth?.sectors || []).map((s: any, i: number) => {
                    const pct = safeNum(s.changePct) ?? 0;
                    const col = pct >= 0 ? '#10B981' : '#EF4444';
                    return (
                      <tr key={s.sector} style={{ borderBottom: '1px solid #0F172A', background: i % 2 === 0 ? '#09090F' : '#07070E' }}>
                        <td style={{ padding: '10px 14px', color: '#F1F5F9', fontWeight: 600 }}>{s.sector}</td>
                        <td style={{ padding: '10px 14px', color: '#94A3B8', textAlign: 'right' }}>{safeNum(s.last) !== null ? Number(s.last).toFixed(2) : '—'}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: col }}>{(pct >= 0 ? '+' : '') + pct.toFixed(2) + '%'}</td>
                        <td style={{ padding: '10px 14px', color: '#475569', textAlign: 'right' }}>{safeNum(s.high) !== null ? Number(s.high).toFixed(2) : '—'}</td>
                        <td style={{ padding: '10px 14px', color: '#475569', textAlign: 'right' }}>{safeNum(s.low) !== null ? Number(s.low).toFixed(2) : '—'}</td>
                        <td style={{ padding: '10px 14px', color: '#475569', textAlign: 'right' }}>{safeNum(s.open) !== null ? Number(s.open).toFixed(2) : '—'}</td>
                        <td style={{ padding: '10px 14px', color: '#475569', textAlign: 'right' }}>{safeNum(s.prevClose) !== null ? Number(s.prevClose).toFixed(2) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* BLOCK DEALS */}
      {tab === 'blocks' && (
        <div>
          <div style={{ background: '#F59E0B10', border: '1px solid #F59E0B30', borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 11, color: '#F59E0B' }}>
            💎 Live NSE block deal feed.
          </div>

          <div style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#06060D' }}>
                    {['Time','Symbol','Qty','Price','Value (Cr)','Chg %','Side','Series'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', color: '#475569', fontSize: 9, textAlign: h === 'Symbol' ? 'left' : 'right', letterSpacing: 1 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(blocks?.deals || []).map((d: any, i: number) => {
                    const pct = safeNum(d.changePct) ?? 0;
                    const col = pct >= 0 ? '#10B981' : '#EF4444';
                    return (
                      <tr key={d.symbol + '-' + i} style={{ borderBottom: '1px solid #0F172A', background: i % 2 === 0 ? '#09090F' : '#07070E' }}>
                        <td style={{ padding: '11px 14px', color: '#64748B', textAlign: 'right' }}>{d.time || '--:--'}</td>
                        <td style={{ padding: '11px 14px', color: '#F59E0B', fontWeight: 700, textAlign: 'left' }}>{d.symbol}</td>
                        <td style={{ padding: '11px 14px', textAlign: 'right', color: '#94A3B8' }}>{safeNum(d.quantity) !== null ? Number(d.quantity).toLocaleString() : '—'}</td>
                        <td style={{ padding: '11px 14px', textAlign: 'right', color: '#94A3B8' }}>{safeNum(d.price) !== null ? Number(d.price).toFixed(2) : '—'}</td>
                        <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, color: '#D4AF37' }}>{safeNum(d.value) !== null ? Number(d.value).toFixed(2) : '—'}</td>
                        <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 800, color: col }}>{(pct >= 0 ? '+' : '') + pct.toFixed(2) + '%'}</td>
                        <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                          <span style={{
                            background: d.side === 'BUY' ? '#10B98120' : '#EF444420',
                            border: '1px solid ' + (d.side === 'BUY' ? '#10B98140' : '#EF444440'),
                            color: d.side === 'BUY' ? '#10B981' : '#EF4444',
                            borderRadius: 4,
                            padding: '3px 10px',
                            fontSize: 9,
                            fontWeight: 700
                          }}>
                            {d.side}
                          </span>
                        </td>
                        <td style={{ padding: '11px 14px', textAlign: 'right', color: '#475569' }}>{d.series || ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div style={{ textAlign: 'center', fontSize: 9, color: '#0F172A', letterSpacing: 1, marginTop: 32, paddingTop: 16, borderTop: '1px solid #0F172A' }}>
        NOT INVESTMENT ADVICE · EDUCATIONAL SIMULATION · RISHI TERMINAL
      </div>
    </div>
  );
}
