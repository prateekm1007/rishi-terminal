'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  FII_DII_HISTORY, MARKET_BREADTH, SECTOR_BREADTH,
  DERIVATIVES, OPTIONS_CHAIN, TOP_GAINERS, TOP_LOSERS,
  BLOCK_DEALS, getMarketMood, getFIISummary,
} from '../../data/marketPulse';
import {
  MACRO_REGIME,
  MACRO_INDICATORS,
  PHILOSOPHER_STANCES,
  CURRENCY_DATA,
  SECTOR_ROTATION,
  getPhilosopherConsensus,
  HISTORICAL_CORRELATIONS,
  CURRENCY_SENSITIVITY,
  getDailyBrief,
  deriveDynamicAgreement,
} from '../../data/economyPlus/macroData';

function fmt(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1000) return (n / 1000).toFixed(1) + 'K Cr';
  return n.toFixed(0) + ' Cr';
}

function fmtVol(n: number) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  return n.toLocaleString();
}

function StatBox({ label, value, sub, color, onClick }: {
  label: string; value: string; sub?: string; color?: string; onClick?: () => void;
}) {
  return (
    <div onClick={onClick}
      style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:10, padding:'14px 16px', textAlign:'center', cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ fontSize:8, color:'#475569', letterSpacing:1, marginBottom:6, textTransform:'uppercase' }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:700, color: color || '#F1F5F9', fontFamily:'JetBrains Mono, monospace' }}>{value}</div>
      {sub && <div style={{ fontSize:9, color:'#334155', marginTop:4 }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ emoji, title, color = '#F59E0B' }: { emoji: string; title: string; color?: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, paddingBottom:10, borderBottom:'1px solid #1E293B' }}>
      <span style={{ fontSize:18 }}>{emoji}</span>
      <span style={{ fontFamily:'Cinzel, Georgia', fontSize:15, color, letterSpacing:2, fontWeight:700 }}>{title}</span>
    </div>
  );
}

type PulseTab = 'overview' | 'macro' | 'rotation' | 'evidence' | 'currency' | 'brief' | 'fii' | 'breadth' | 'derivatives' | 'movers' | 'blocks';

function isValidPulseTab(t: string | null): t is PulseTab {
  return (
    t === 'overview' ||
    t === 'macro' ||
    t === 'rotation' ||
    t === 'fii' ||
    t === 'breadth' ||
    t === 'derivatives' ||
    t === 'movers' ||
    t === 'evidence' ||
    t === 'currency' ||
    t === 'brief' ||
    t === 'blocks'
  );
}


export default function MarketPulsePage() {
  const [tab, setTab] = useState<PulseTab>('macro');
  // ── LIVE DATA (real-time) — sourced from internal /api/prices ─────────────
  const [livePrices, setLivePrices] = useState<Record<string, any> | null>(null);
  const [livePricesErr, setLivePricesErr] = useState<string | null>(null);
  const [liveContext, setLiveContext] = useState<{ breadthBullish?: number; fiiNetCr?: number; derivativesSignal?: number; historicalSpread30d?: number; evidenceRecencyHours?: number; pricedIn?: boolean } | null>(null);
  const [hist30d, setHist30d] = useState<number | null>(null); // Phase 4B


  // Deep-link tabs via ?tab= (client-side only; avoids useSearchParams + Suspense requirement)
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

  const mood    = getMarketMood();
  const fiiSum  = getFIISummary();
  const today   = FII_DII_HISTORY[0];
  // Dynamic stances: derive agreement from indicators + regime + mood (SSR-safe)
  const dynamicStances = useMemo(() => PHILOSOPHER_STANCES.map((ph) => ({
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
    const avgAgreement = Math.round(agreements.reduce((a,b) => a + b, 0) / Math.max(1, agreements.length));
    const spread = Math.max(...agreements) - Math.min(...agreements);
    const label = avgAgreement >= 70 ? 'High Conviction' : avgAgreement >= 55 ? 'Moderate' : 'Low Conviction';
    const color = avgAgreement >= 70 ? '#10B981' : avgAgreement >= 55 ? '#F59E0B' : '#EF4444';
    return { avgAgreement, spread, label, color };
  }, [dynamicStances]);
  const [activeLens, setActiveLens] = useState<'All' | 'Hayek' | 'Friedman' | 'Keynes'>('All');

  // Persist philosopher lens across reloads
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('economyPlus.activeLens');
      if (saved === 'All' || saved === 'Hayek' || saved === 'Friedman' || saved === 'Keynes') {
        setActiveLens(saved as any);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem('economyPlus.activeLens', activeLens); } catch {}
  }, [activeLens]);

  // Phase 2: fetch live market context for dynamic agreement scoring
  useEffect(() => {
    let cancelled = false;
    const fetchLiveContext = async () => {
      try {
        const res = await fetch('/api/prices');
        if (!res.ok || cancelled) return;
        const data = await res.json();
        // Phase 3: derive from /api/prices real keys (NIFTY50, USD/INR, GOLD)
        const getPct = (x: any): number => {
          if (!x) return 0;
          if (typeof x.changePercent === 'number') return x.changePercent;
          if (typeof x.percentChange === 'number') return x.percentChange;
          if (typeof x.pChange === 'number') return x.pChange;
          if (typeof x.change === 'number' && typeof x.price === 'number' && x.price !== 0) return (x.change / x.price) * 100;
          return 0;
        };
        const niftyChg  = getPct(data?.['NIFTY50']);
        const usdInrChg = getPct(data?.['USD/INR']);
        const goldChg   = getPct(data?.['GOLD']);

        const breadthBullish = Math.max(0, Math.min(100, 50 + (niftyChg * 5)));
        const fiiNetCr = usdInrChg > 0.3 ? -3000 : usdInrChg < -0.3 ? 3000 : 0;
        const derivativesSignal = goldChg > 0.5 ? -1 : goldChg < -0.5 ? 1 : 0;

        const historicalSpread30d = hist30d ?? 50; // Phase 4B: real API, fallback 50
        const evidenceRecencyHours = 6;
        const pricedIn = Math.abs(niftyChg) > 1.5;
        if (!cancelled) setLiveContext({ breadthBullish, fiiNetCr, derivativesSignal, historicalSpread30d, evidenceRecencyHours, pricedIn });
      } catch {}
    };
    fetchLiveContext();
    return () => { cancelled = true; };
  }, []);

  // Phase 4B: fetch real historical spread from /api/history/breadth
  useEffect(() => {
    let cancelled = false;
    const fetchHist = async () => {
      try {
        const res = await fetch("/api/history/breadth");
        if (!res.ok) return;
        const d = await res.json();
        if (!cancelled && typeof d?.breadth30dAvg === "number") {
          setHist30d(d.breadth30dAvg);
        }
      } catch {}
    };
    fetchHist();
    return () => { cancelled = true; };
  }, []);

  const brief = getDailyBrief();
  const regime = MACRO_REGIME;
  const councilReco =
    consensus.spread >= 55
      ? 'High uncertainty. Avoid leverage, prioritize balance-sheet strength, and size positions conservatively.'
      : consensus.avgAgreement >= 65
      ? 'Consensus tilts constructive. Prefer quality compounders + domestic cyclicals with strong cashflows.'
      : 'Mixed regime. Stay barbell: quality defensives + selective cyclicals. Keep cash for volatility.';

  const tabs: { key: PulseTab; label: string; emoji: string }[] = [
    { key:'overview',    label:'Overview',    emoji:'📊' },
    { key:'macro',       label:'Macro Regime', emoji:'🧠' },
    { key:'rotation',    label:'Sector Rotation', emoji:'🔄' },
    { key:'evidence',    label:'Evidence',       emoji:'📚' },
    { key:'currency',    label:'Currency',       emoji:'💱' },
    { key:'brief',       label:'Daily Brief',    emoji:'📰' },
    { key:'fii',         label:'FII / DII',   emoji:'🏦' },
    { key:'breadth',     label:'Breadth',     emoji:'📈' },
    { key:'derivatives', label:'Derivatives', emoji:'⚙️' },
    { key:'movers',      label:'Movers',      emoji:'🚀' },
    { key:'blocks',      label:'Block Deals', emoji:'💎' },
  ];

  return (
    <div style={{ fontFamily:'JetBrains Mono, monospace', background:'#050508', color:'#E2E8F0', minHeight:'100vh', padding:24, maxWidth:1400, margin:'0 auto' }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap"/>

      <span data-rt-debug="ep-debug:v3;priceDerived=1;labLens=1" style={{ display:'none' }} aria-hidden="true" />
      {/* HEADER */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <Link href="/" style={{ color:'#F59E0B', textDecoration:'none', fontSize:11, display:'block', marginBottom:8 }}>← Dashboard</Link>
          <div style={{ fontFamily:'Cinzel, Georgia', fontSize:20, color:'#F59E0B', letterSpacing:3, fontWeight:700 }}>🌐 ECONOMY PLUS</div>
          <div style={{ fontSize:9, color:'#334155', letterSpacing:2, marginTop:3 }}>MACRO INTELLIGENCE · PHILOSOPHER COUNCIL · REGIME ANALYSIS</div>

        </div>
        <div style={{ background:`${mood.color}15`, border:`1px solid ${mood.color}40`, borderRadius:10, padding:'12px 20px', textAlign:'center' }}>
          <div style={{ fontSize:9, color:'#475569', letterSpacing:2, marginBottom:4 }}>MARKET MOOD</div>
          <div style={{ fontSize:22, fontWeight:700, color:mood.color, fontFamily:'Cinzel, Georgia' }}>{mood.mood}</div>
          <div style={{ fontSize:9, color:'#475569', marginTop:4 }}>Score: {mood.score}/100</div>
        </div>
      </div>

      {/* MOOD DESCRIPTION */}
      <div style={{ background:`${mood.color}10`, border:`1px solid ${mood.color}25`, borderRadius:8, padding:'10px 16px', marginBottom:24, fontSize:11, color:mood.color }}>
        ⚡ {mood.description}
      </div>

      {/* ECONOMY PLUS — REGIME BANNER + DISAGREEMENT INDEX */}
          {/* Phase 4A: Animated spread bar */}
          <div style={{ marginTop: 10, width: "100%", maxWidth: 360 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "#94A3B8" }}>Disagreement Spread</span>
              <span style={{ fontSize: 11, color: "#94A3B8" }}>{consensus.spread} pts</span>
            </div>
            <div style={{ width: "100%", height: 8, background: "#1E293B", borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${Math.min(100, consensus.spread)}%`,
                background: consensus.color,
                borderRadius: 4,
                transition: "width 0.7s ease, background 0.7s ease"
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 10, color: "#475569" }}>0 — Consensus</span>
              <span style={{ fontSize: 10, color: "#475569" }}>100 — Max Disagreement</span>
            </div>
          </div>
      <div style={{ background:'#09090F', border:'1px solid #D4AF37', borderRadius:12, padding:16, marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:9, color:'#64748B', letterSpacing:2 }}>CURRENT MACRO REGIME</div>
            <div style={{ fontFamily:'Cinzel, Georgia', fontSize:16, color:'#D4AF37', letterSpacing:2, fontWeight:700, marginTop:4 }}>
              {regime.label}
            </div>
            <div style={{ fontSize:10, color:'#94A3B8', marginTop:6 }}>{regime.sublabel}</div>
          </div>

          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:9, color:'#64748B', letterSpacing:2 }}>CONSENSUS SCORE</div>
            <div style={{ marginTop:4, fontSize:14, fontWeight:800, color:consensus.color }}>
              {consensus.avgAgreement}/100 · {consensus.label}
            </div>
            <div style={{ marginTop:6, fontSize:10, color:'#94A3B8' }}>
              Disagreement Index: <span style={{ color: consensus.spread >= 55 ? '#EF4444' : consensus.spread >= 35 ? '#F59E0B' : '#10B981', fontWeight:800 }}>{consensus.spread}</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop:12, height:6, background:'#1E293B', borderRadius:999, overflow:'hidden' }}>
          <div style={{ width: Math.min(100, Math.max(0, consensus.spread)) + '%', height:'100%', background: consensus.spread >= 55 ? '#EF4444' : consensus.spread >= 35 ? '#F59E0B' : '#10B981' }} />
        </div>

        <div style={{ marginTop:12, fontSize:11, color:'#CBD5E1', lineHeight:1.6 }}>
          <span style={{ color:'#D4AF37', fontWeight:800 }}>What the Council Recommends:</span> {councilReco}
        </div>
      </div>
      {/* PHILOSOPHER COUNCIL */}
      {/* PHILOSOPHER_LENS_TOGGLE_MARKER */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <span style={{ fontSize:10, color:'#475569', letterSpacing:1 }}>LENS:</span>
        {(['All','Hayek','Friedman','Keynes'] as const).map(lens => (
          <button key={lens} onClick={() => setActiveLens(lens)} style={{ padding:'5px 14px', borderRadius:999, cursor:'pointer', fontFamily:'JetBrains Mono, monospace', fontSize:10, fontWeight:700, background: activeLens === lens ? '#D4AF37' : '#09090F', color: activeLens === lens ? '#050508' : '#475569', border: activeLens === lens ? '1px solid #D4AF37' : '1px solid #1E293B' }}>
            {lens === 'All' ? '🌐 All' : lens === 'Hayek' ? '🏛️ Hayek' : lens === 'Friedman' ? '📊 Friedman' : '⚙️ Keynes'}
          </button>
        ))}
      </div>
      <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, padding:16, marginBottom:24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, gap:12, flexWrap:'wrap' }}>
          <div style={{ fontFamily:'Cinzel, Georgia', fontSize:14, color:'#F59E0B', letterSpacing:2, fontWeight:700 }}>
            🧠 PHILOSOPHER COUNCIL
          </div>
          <div style={{ fontSize:10, color:consensus.color, background: consensus.color + '12', border:'1px solid ' + consensus.color + '35', padding:'6px 10px', borderRadius:999 }}>
            {consensus.label} · Spread {consensus.spread} · Avg {consensus.avgAgreement}/100
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:10 }}>
          {PHILOSOPHER_STANCES.map(p => (
            <div key={p.philosopher} style={{ background:'#050508', border:'1px solid #1E293B', borderRadius:10, padding:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ fontSize:20 }}>{p.emoji}</div>
                <div>
                  <div style={{ fontSize:12, fontWeight:800, color:p.color }}>{p.philosopher}</div>
                  <div style={{ fontSize:9, color:'#475569', marginTop:2 }}>{p.shortBio}</div>
                </div>
              </div>
              <div style={{ marginTop:10, fontSize:10, color:'#94A3B8', lineHeight:1.5 }}>
                {p.currentStance}: {p.keyWarning}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* TAB BAR */}
      <div style={{ display:'flex', gap:8, marginBottom:24, flexWrap:'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding:'8px 16px', background: tab === t.key ? '#F59E0B15' : '#09090F', border: tab === t.key ? '1px solid #F59E0B' : '1px solid #1E293B', borderRadius:8, color: tab === t.key ? '#F59E0B' : '#475569', cursor:'pointer', fontSize:11, fontFamily:'JetBrains Mono, monospace', display:'flex', alignItems:'center', gap:6 }}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════ */}
      {/* OVERVIEW TAB                        */}
      {/* ═══════════════════════════════════ */}
      {tab === 'overview' && (
        <div>
          {/* KEY METRICS */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:10, marginBottom:28 }}>
            <StatBox label="Advances"          value={MARKET_BREADTH.advances.toString()}  color="#10B981" sub={`of ${MARKET_BREADTH.total} stocks`} />
            <StatBox label="Declines"          value={MARKET_BREADTH.declines.toString()}  color="#EF4444" sub={`of ${MARKET_BREADTH.total} stocks`} />
            <StatBox label="A/D Ratio"         value={MARKET_BREADTH.advanceDeclineRatio.toFixed(2)} color={MARKET_BREADTH.advanceDeclineRatio > 1 ? '#10B981' : '#EF4444'} sub="Advances ÷ Declines" />
            <StatBox label="52W Highs"         value={MARKET_BREADTH.newHighs52w.toString()} color="#10B981" sub="New records today" />
            <StatBox label="52W Lows"          value={MARKET_BREADTH.newLows52w.toString()}  color="#EF4444" sub="New lows today" />
            <StatBox label="Above 200 SMA"     value={MARKET_BREADTH.aboveSMA200.toString()} color="#10B981" sub="Long-term uptrend" />
            <StatBox label="FII Today"         value={`${today.fiiNet > 0 ? '+' : ''}${fmt(today.fiiNet)}`} color={today.fiiNet > 0 ? '#10B981' : '#EF4444'} sub="Net buy/sell" />
            <StatBox label="DII Today"         value={`${today.diiNet > 0 ? '+' : ''}${fmt(today.diiNet)}`} color={today.diiNet > 0 ? '#10B981' : '#EF4444'} sub="Net buy/sell" />
            <StatBox label="Put/Call Ratio"    value={MARKET_BREADTH.putCallRatio.toFixed(2)} color={MARKET_BREADTH.putCallRatio < 0.8 ? '#EF4444' : MARKET_BREADTH.putCallRatio > 1.2 ? '#10B981' : '#F59E0B'} sub="<0.8 Bearish OI" />
            <StatBox label="India VIX"         value={DERIVATIVES.vix.toFixed(2)} color={DERIVATIVES.vix < 15 ? '#10B981' : DERIVATIVES.vix < 20 ? '#F59E0B' : '#EF4444'} sub={`${DERIVATIVES.vixChange > 0 ? '+' : ''}${DERIVATIVES.vixChange}% today`} />
            <StatBox label="McClellan Osc."    value={MARKET_BREADTH.mcclellanOscillator.toFixed(1)} color={MARKET_BREADTH.mcclellanOscillator > 0 ? '#10B981' : '#EF4444'} sub=">0 bullish breadth" />
            <StatBox label="% Bullish Stocks"  value={MARKET_BREADTH.bullishPct.toFixed(1) + '%'} color="#F59E0B" sub="Point & Figure" />
          </div>

          {/* VOLUME BREADTH */}
          <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, padding:20, marginBottom:24 }}>
            <SectionTitle emoji="📊" title="VOLUME BREADTH" />
            <div style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontSize:10, color:'#10B981' }}>Up Volume: {fmtVol(MARKET_BREADTH.upVolume)}</span>
                <span style={{ fontSize:10, color:'#EF4444' }}>Down Volume: {fmtVol(MARKET_BREADTH.downVolume)}</span>
              </div>
              <div style={{ height:20, background:'#1E293B', borderRadius:4, display:'flex', overflow:'hidden' }}>
                <div style={{ width:`${(MARKET_BREADTH.upVolume / MARKET_BREADTH.totalVolume) * 100}%`, background:'#10B981', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:9, color:'#050508', fontWeight:700 }}>{((MARKET_BREADTH.upVolume / MARKET_BREADTH.totalVolume) * 100).toFixed(0)}%</span>
                </div>
                <div style={{ flex:1, background:'#EF4444', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:9, color:'#050508', fontWeight:700 }}>{((MARKET_BREADTH.downVolume / MARKET_BREADTH.totalVolume) * 100).toFixed(0)}%</span>
                </div>
              </div>
              <div style={{ fontSize:9, color:'#334155', marginTop:6, textAlign:'center' }}>Total: {fmtVol(MARKET_BREADTH.totalVolume)}</div>
            </div>
          </div>

          {/* ADVANCE DECLINE VISUAL */}
          <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, padding:20, marginBottom:24 }}>
            <SectionTitle emoji="📈" title="ADVANCE / DECLINE BREADTH" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
              {[
                { label:'Advancing', value: MARKET_BREADTH.advances, color:'#10B981', pct: Math.round(MARKET_BREADTH.advances / MARKET_BREADTH.total * 100) },
                { label:'Unchanged', value: MARKET_BREADTH.unchanged, color:'#818CF8', pct: Math.round(MARKET_BREADTH.unchanged / MARKET_BREADTH.total * 100) },
                { label:'Declining', value: MARKET_BREADTH.declines, color:'#EF4444', pct: Math.round(MARKET_BREADTH.declines / MARKET_BREADTH.total * 100) },
              ].map(item => (
                <div key={item.label} style={{ textAlign:'center', background:'#050508', borderRadius:8, padding:16 }}>
                  <div style={{ fontSize:28, fontWeight:700, color:item.color }}>{item.value}</div>
                  <div style={{ fontSize:12, color:item.color, marginTop:4 }}>{item.pct}%</div>
                  <div style={{ fontSize:9, color:'#334155', marginTop:4 }}>{item.label}</div>
                  <div style={{ height:4, background:'#1E293B', borderRadius:2, marginTop:8 }}>
                    <div style={{ width:`${item.pct}%`, height:'100%', background:item.color, borderRadius:2 }}/>
                  </div>
                </div>
              ))}
            </div>

            {/* SECTOR HEATMAP */}
            <div style={{ fontSize:10, color:'#475569', letterSpacing:1, marginBottom:12, fontWeight:600 }}>SECTOR HEATMAP</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:8 }}>
              {SECTOR_BREADTH.map(s => {
                const pct = s.netChange;
                const bg  = pct > 2 ? '#10B981' : pct > 0 ? '#10B98150' : pct > -2 ? '#EF444450' : '#EF4444';
                const fg  = Math.abs(pct) > 1.5 ? '#050508' : '#E2E8F0';
                return (
                  <div key={s.sector} style={{ background:bg, borderRadius:8, padding:'10px 12px', textAlign:'center' }}>
                    <div style={{ fontSize:10, color:fg, fontWeight:700 }}>{s.sector}</div>
                    <div style={{ fontSize:14, color:fg, fontWeight:700, marginTop:4 }}>{pct > 0 ? '+' : ''}{pct.toFixed(1)}%</div>
                    <div style={{ fontSize:8, color:fg, marginTop:2, opacity:0.8 }}>{s.advances}↑ {s.declines}↓</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════ */}
      {/* ═══════════════════════════════════ */}
      {/* MACRO TAB — Economy Plus Foundation */}
      {/* ═══════════════════════════════════ */}
      {tab === 'macro' && (
        <div>
          <div style={{ background:'#09090F', border:'1px solid #D4AF37', borderRadius:12, padding:20, marginBottom:24 }}>
            <div style={{ fontSize:10, color:'#475569', letterSpacing:2, marginBottom:6 }}>CURRENT MACRO REGIME</div>
            <div style={{ fontFamily:'Cinzel, Georgia', fontSize:18, color:'#D4AF37', letterSpacing:2, fontWeight:700 }}>
              {regime.label}
            </div>
            <div style={{ fontSize:10, color:'#64748B', marginTop:6 }}>{regime.sublabel}</div>
            <div style={{ fontSize:11, color:'#CBD5E1', lineHeight:1.7, marginTop:12 }}>{regime.description}</div>
            <div style={{ marginTop:12, fontSize:10, color:'#475569' }}>
              Historical Analog: {regime.historicalAnalog} ({regime.analogPeriod})
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:10, marginBottom:24 }}>
            {MACRO_INDICATORS.map(ind => (
              <div key={ind.label} style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:10, padding:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', gap:10 }}>
                  <div style={{ fontSize:10, color:'#64748B', letterSpacing:1, textTransform:'uppercase' }}>{ind.label}</div>
                  <div style={{
                    fontSize:12,
                    fontWeight:800,
                    color: ind.signal === 'bullish' ? '#10B981' : ind.signal === 'bearish' ? '#EF4444' : '#F59E0B'
                  }}>
                    {ind.value}{ind.unit}
                  </div>
                </div>
                <div style={{ fontSize:10, color:'#94A3B8', lineHeight:1.6, marginTop:8 }}>{ind.description}</div>
                <div style={{ fontSize:9, color:'#475569', marginTop:10 }}>
                  As of {ind.asOf} · {ind.trendValue}
                </div>
              </div>
            ))}
          </div>
          <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, padding:20, marginBottom:24 }}>
            <SectionTitle emoji="🧭" title="COUNCIL — SECTOR IMPLICATIONS" color="#D4AF37" />
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:12 }}>
              {PHILOSOPHER_STANCES.map(p => (
                <div key={p.philosopher} style={{ background:'#050508', border:'1px solid #1E293B', borderRadius:10, padding:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
                    <div style={{ fontSize:12, fontWeight:900, color:p.color }}>{p.emoji} {p.philosopher}</div>
                    <div style={{ fontSize:9, color:'#94A3B8', background:'#0B1220', border:'1px solid #1E293B', padding:'4px 10px', borderRadius:999 }}>
                      {p.keyConcernTag || 'Key Concern'}
                    </div>
                  </div>

                  <div style={{ marginTop:10, fontSize:10, color:'#94A3B8', lineHeight:1.6 }}>
                    {p.sectorImplications && p.sectorImplications.length > 0 ? (
                      <ul style={{ margin:'0 0 0 16px', padding:0 }}>
                        {p.sectorImplications.slice(0, 4).map((s, idx) => (
                          <li key={idx} style={{ margin:'6px 0' }}>{s}</li>
                        ))}
                      </ul>
                    ) : (
                      <span>—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, padding:20 }}>
            <SectionTitle emoji="💱" title="CURRENCY IMPACT — INR SNAPSHOT" color="#D4AF37" />
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:12 }}>
              {CURRENCY_DATA.map(c => {
                const pos = c.changePct >= 0;
                const col = pos ? '#EF4444' : '#10B981';
                return (
                  <div key={c.pair} style={{ background:'#050508', border:'1px solid #1E293B', borderRadius:10, padding:14 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:10 }}>
                      <div style={{ fontSize:12, fontWeight:900, color:'#F1F5F9' }}>{c.pair}</div>
                      <div style={{ fontSize:12, fontWeight:900, color:'#F1F5F9' }}>{c.rate.toFixed(4)}</div>
                    </div>
                    <div style={{ marginTop:8, fontSize:10, color:col, fontWeight:800 }}>
                      {pos ? '+' : ''}{c.changePct.toFixed(2)}% ({pos ? '+' : ''}{c.change.toFixed(2)})
                    </div>
                    <div style={{ marginTop:8, fontSize:10, color:'#94A3B8', lineHeight:1.6 }}>{c.signal}</div>
                    <div style={{ marginTop:10, fontSize:9, color:'#475569' }}>
                      Trend: {c.trend} · Vol: {c.volatility}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}


      {/* ═══════════════════════════════════ */}
      {/* SECTOR ROTATION TAB               */}
      {/* ═══════════════════════════════════ */}
      {tab === 'rotation' && (
        <div>

          {/* LEGEND */}
          <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, padding:16, marginBottom:24 }}>
            <div style={{ fontFamily:'Cinzel, Georgia', fontSize:14, color:'#D4AF37', letterSpacing:2, fontWeight:700, marginBottom:12 }}>
              🔄 SECTOR ROTATION OUTLOOK
            </div>
            <div style={{ fontSize:11, color:'#94A3B8', lineHeight:1.6, marginBottom:14 }}>
              Each sector is scored independently by Hayek, Friedman, and Keynes based on the current macro regime.
              Consensus = average of three scores. Spread = philosopher disagreement (higher = more divided).
            </div>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', fontSize:10 }}>
              {[
                { label:'Strong Buy', color:'#10B981' },
                { label:'Accumulate', color:'#34D399' },
                { label:'Neutral',    color:'#F59E0B' },
                { label:'Reduce',     color:'#F97316' },
                { label:'Avoid',      color:'#EF4444' },
              ].map(b => (
                <div key={b.label} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:10, height:10, borderRadius:3, background:b.color }} />
                  <span style={{ color:'#64748B' }}>{b.label}</span>
                </div>
              ))}
              <div style={{ marginLeft:'auto', color:'#475569', fontSize:9 }}>Scores: 0 = Strongly Avoid · 100 = Strongly Buy</div>
            </div>
          </div>

          {/* PHILOSOPHER × SECTOR MATRIX HEADER */}
          <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, overflow:'hidden', marginBottom:24 }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                <thead>
                  <tr style={{ background:'#06060D' }}>
                    <th style={{ padding:'12px 16px', textAlign:'left',   color:'#475569', fontSize:9, letterSpacing:1, minWidth:140 }}>SECTOR</th>
                    <th style={{ padding:'12px 16px', textAlign:'center', color:'#818CF8', fontSize:9, letterSpacing:1 }}>🏛️ HAYEK</th>
                    <th style={{ padding:'12px 16px', textAlign:'center', color:'#34D399', fontSize:9, letterSpacing:1 }}>📊 FRIEDMAN</th>
                    <th style={{ padding:'12px 16px', textAlign:'center', color:'#FB923C', fontSize:9, letterSpacing:1 }}>⚙️ KEYNES</th>
                    <th style={{ padding:'12px 16px', textAlign:'center', color:'#D4AF37', fontSize:9, letterSpacing:1 }}>CONSENSUS</th>
                    <th style={{ padding:'12px 16px', textAlign:'center', color:'#475569', fontSize:9, letterSpacing:1 }}>SPREAD</th>
                    <th style={{ padding:'12px 16px', textAlign:'center', color:'#475569', fontSize:9, letterSpacing:1 }}>BIAS</th>
                    <th style={{ padding:'12px 16px', textAlign:'left',   color:'#475569', fontSize:9, letterSpacing:1, minWidth:180 }}>KEY MACRO DRIVER</th>
                  </tr>
                </thead>
                <tbody>
                  {SECTOR_ROTATION.map((s, i) => {
                    const spreadCol = s.spread >= 50 ? '#EF4444' : s.spread >= 30 ? '#F59E0B' : '#10B981';
                    const scoreCell = (score: number) => {
                      const bg = score >= 70 ? '#10B98120' : score >= 55 ? '#F59E0B15' : '#EF444415';
                      const fg = score >= 70 ? '#10B981'   : score >= 55 ? '#F59E0B'   : '#EF4444';
                      return { bg, fg };
                    };
                    const hc = scoreCell(s.hayek.score);
                    const fc = scoreCell(s.friedman.score);
                    const kc = scoreCell(s.keynes.score);
                    const cc = scoreCell(s.consensus);
                    return (
                      <tr key={s.sector} style={{ borderBottom:'1px solid #0F172A', background: i % 2 === 0 ? '#09090F' : '#070710' }}>
                        <td style={{ padding:'12px 16px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ fontSize:16 }}>{s.icon}</span>
                            <span style={{ color:'#F1F5F9', fontWeight:700 }}>{s.sector}</span>
                          </div>
                        </td>
                        <td style={{ padding:'12px 16px', textAlign:'center', background:hc.bg }}>
                          <div style={{ fontWeight:800, color:hc.fg }}>{s.hayek.score}</div>
                          <div style={{ fontSize:9, color:'#475569', marginTop:2 }}>{s.hayek.stance}</div>
                        </td>
                        <td style={{ padding:'12px 16px', textAlign:'center', background:fc.bg }}>
                          <div style={{ fontWeight:800, color:fc.fg }}>{s.friedman.score}</div>
                          <div style={{ fontSize:9, color:'#475569', marginTop:2 }}>{s.friedman.stance}</div>
                        </td>
                        <td style={{ padding:'12px 16px', textAlign:'center', background:kc.bg }}>
                          <div style={{ fontWeight:800, color:kc.fg }}>{s.keynes.score}</div>
                          <div style={{ fontSize:9, color:'#475569', marginTop:2 }}>{s.keynes.stance}</div>
                        </td>
                        <td style={{ padding:'12px 16px', textAlign:'center', background:cc.bg }}>
                          <div style={{ fontWeight:800, color:cc.fg, fontSize:15 }}>{s.consensus}</div>
                          <div style={{ marginTop:6, height:4, background:'#1E293B', borderRadius:999, overflow:'hidden', width:'80%', margin:'6px auto 0' }}>
                            <div style={{ width: s.consensus + '%', height:'100%', background:cc.fg }} />
                          </div>
                        </td>
                        <td style={{ padding:'12px 16px', textAlign:'center' }}>
                          <span style={{ color:spreadCol, fontWeight:700 }}>{s.spread}</span>
                          <div style={{ fontSize:9, color:'#334155', marginTop:2 }}>
                            {s.spread >= 50 ? 'High conflict' : s.spread >= 30 ? 'Moderate' : 'Aligned'}
                          </div>
                        </td>
                        <td style={{ padding:'12px 16px', textAlign:'center' }}>
                          <span style={{
                            background: s.biasColor + '20',
                            border: '1px solid ' + s.biasColor + '50',
                            color: s.biasColor,
                            padding:'4px 10px',
                            borderRadius:999,
                            fontSize:10,
                            fontWeight:700,
                            whiteSpace:'nowrap'
                          }}>
                            {s.forwardBias}
                          </span>
                        </td>
                        <td style={{ padding:'12px 16px', color:'#64748B', fontSize:10 }}>{s.keyMacroDriver}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* PHILOSOPHER RATIONALE DEEP CARDS */}
          <div style={{ marginBottom:8 }}>
            <div style={{ fontFamily:'Cinzel, Georgia', fontSize:13, color:'#D4AF37', letterSpacing:2, fontWeight:700, marginBottom:16 }}>
              PHILOSOPHER RATIONALE — TOP CONVICTION SECTORS
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:14 }}>
              {SECTOR_ROTATION.filter(s => s.forwardBias === 'Strong Buy' || s.forwardBias === 'Avoid').map(s => (
                <div key={s.sector} style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, padding:16 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:18 }}>{s.icon}</span>
                      <span style={{ fontWeight:700, color:'#F1F5F9', fontSize:13 }}>{s.sector}</span>
                    </div>
                    <span style={{
                      background: s.biasColor + '20',
                      border:'1px solid ' + s.biasColor + '50',
                      color: s.biasColor,
                      padding:'3px 10px',
                      borderRadius:999,
                      fontSize:9,
                      fontWeight:700
                    }}>
                      {s.forwardBias}
                    </span>
                  </div>

                  {([
                    { key:'🏛️ Hayek',    data: s.hayek,    color:'#818CF8' },
                    { key:'📊 Friedman', data: s.friedman, color:'#34D399' },
                    { key:'⚙️ Keynes',   data: s.keynes,   color:'#FB923C' },
                  ] as const).map(p => (
                    <div key={p.key} style={{ marginBottom:10, paddingBottom:10, borderBottom:'1px solid #0F172A' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:10, color:p.color, fontWeight:700 }}>{p.key}</span>
                        <span style={{ fontSize:11, fontWeight:800, color:
                          p.data.score >= 70 ? '#10B981' : p.data.score >= 55 ? '#F59E0B' : '#EF4444'
                        }}>{p.data.score}</span>
                      </div>
                      <div style={{ fontSize:10, color:'#64748B', lineHeight:1.5 }}>{p.data.rationale}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
            {/* ═══════════════════════════════════ */}
      {/* B: EVIDENCE TAB                    */}
      {/* ═══════════════════════════════════ */}
      {tab === 'evidence' && (
        <div>
          <div style={{ background:'#09090F', border:'1px solid #D4AF37', borderRadius:12, padding:16, marginBottom:24 }}>
            <div style={{ fontFamily:'Cinzel, Georgia', fontSize:14, color:'#D4AF37', letterSpacing:2, fontWeight:700, marginBottom:8 }}>
              📚 HISTORICAL EVIDENCE ENGINE
            </div>
            <div style={{ fontSize:11, color:'#94A3B8', lineHeight:1.6 }}>
              Evidence cards: macro condition → historical outcome. Filtered by active lens.
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))', gap:14 }}>
            {HISTORICAL_CORRELATIONS
              .filter(c => activeLens === 'All' || c.philosopher === activeLens || c.philosopher === 'All')
              .map(c => (
                <div key={c.id} style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, padding:18, position:'relative' }}>

                  {c.regimeMatch && (
                    <div style={{ position:'absolute', top:12, right:12, fontSize:9, color:'#10B981', background:'#10B98115', border:'1px solid #10B98130', padding:'3px 8px', borderRadius:999, fontWeight:700 }}>
                      ✓ CURRENT REGIME MATCH
                    </div>
                  )}

                  <div style={{ fontSize:12, color:'#F1F5F9', fontWeight:700, lineHeight:1.4, marginBottom:12, paddingRight:100 }}>
                    {c.title}
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
                    <div style={{ background:'#050508', border:'1px solid #1E293B', borderRadius:10, padding:10, textAlign:'center' }}>
                      <div style={{ fontSize:9, color:'#475569' }}>WIN RATE</div>
                      <div style={{ fontSize:18, fontWeight:900, color: c.winRate >= 75 ? '#10B981' : c.winRate >= 60 ? '#F59E0B' : '#EF4444' }}>
                        {c.winRate}%
                      </div>
                    </div>
                    <div style={{ background:'#050508', border:'1px solid #1E293B', borderRadius:10, padding:10, textAlign:'center' }}>
                      <div style={{ fontSize:9, color:'#475569' }}>AVG</div>
                      <div style={{ fontSize:12, fontWeight:800, color:'#D4AF37' }}>{c.avgReturn}</div>
                    </div>
                    <div style={{ background:'#050508', border:'1px solid #1E293B', borderRadius:10, padding:10, textAlign:'center' }}>
                      <div style={{ fontSize:9, color:'#475569' }}>N</div>
                      <div style={{ fontSize:18, fontWeight:900, color:'#F1F5F9' }}>{c.instances}</div>
                    </div>
                  </div>

                  <div style={{ fontSize:10, color:'#64748B', lineHeight:1.6, marginBottom:8 }}>
                    <span style={{ color:'#94A3B8', fontWeight:700 }}>Condition: </span>{c.condition}
                  </div>
                  <div style={{ fontSize:10, color:'#64748B', lineHeight:1.6, marginBottom:10 }}>
                    <span style={{ color:'#94A3B8', fontWeight:700 }}>Outcome: </span>{c.outcome}
                  </div>

                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:9, color:c.confidenceColor, background:c.confidenceColor + '15', border:'1px solid ' + c.confidenceColor + '30', padding:'3px 8px', borderRadius:999, fontWeight:700 }}>
                      {c.confidence} Confidence
                    </span>
                    <span style={{ fontSize:9, color:c.philosopherColor }}>
                      {c.philosopher === 'All' ? '🌐 All' : c.philosopher === 'Hayek' ? '🏛️ Hayek' : c.philosopher === 'Friedman' ? '📊 Friedman' : '⚙️ Keynes'}
                    </span>
                  </div>

                </div>
              ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════ */}
      {/* C: CURRENCY TAB                    */}
      {/* ═══════════════════════════════════ */}
      {tab === 'currency' && (
        <div>
          <div style={{ background:'#09090F', border:'1px solid #D4AF37', borderRadius:12, padding:16, marginBottom:24 }}>
            <div style={{ fontFamily:'Cinzel, Georgia', fontSize:14, color:'#D4AF37', letterSpacing:2, fontWeight:700, marginBottom:8 }}>
              💱 CURRENCY SENSITIVITY MATRIX
            </div>
            <div style={{ fontSize:11, color:'#94A3B8', lineHeight:1.6 }}>
              Estimated earnings sensitivity per 1% INR move (heuristic).
            </div>
          </div>

          <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, overflow:'hidden' }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                <thead>
                  <tr style={{ background:'#06060D' }}>
                    <th style={{ padding:'12px 16px', textAlign:'left', color:'#475569', fontSize:9, letterSpacing:1 }}>SECTOR</th>
                    <th style={{ padding:'12px 16px', textAlign:'center', color:'#475569', fontSize:9, letterSpacing:1 }}>REV</th>
                    <th style={{ padding:'12px 16px', textAlign:'center', color:'#475569', fontSize:9, letterSpacing:1 }}>COST</th>
                    <th style={{ padding:'12px 16px', textAlign:'center', color:'#10B981', fontSize:9, letterSpacing:1 }}>INR WEAK +1%</th>
                    <th style={{ padding:'12px 16px', textAlign:'center', color:'#EF4444', fontSize:9, letterSpacing:1 }}>INR STRONG +1%</th>
                    <th style={{ padding:'12px 16px', textAlign:'center', color:'#475569', fontSize:9, letterSpacing:1 }}>BIAS</th>
                    <th style={{ padding:'12px 16px', textAlign:'left', color:'#475569', fontSize:9, letterSpacing:1 }}>EXAMPLES</th>
                  </tr>
                </thead>
                <tbody>
                  {CURRENCY_SENSITIVITY.map((s, i) => (
                    <tr key={s.sector} style={{ borderBottom:'1px solid #0F172A', background: i % 2 === 0 ? '#09090F' : '#070710' }}>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ fontSize:16 }}>{s.icon}</span>
                        <span style={{ color:'#F1F5F9', fontWeight:700, marginLeft:8 }}>{s.sector}</span>
                      </td>
                      <td style={{ padding:'12px 16px', textAlign:'center', color:'#94A3B8', fontSize:10 }}>{s.revenueExposure}</td>
                      <td style={{ padding:'12px 16px', textAlign:'center', color:'#94A3B8', fontSize:10 }}>{s.costExposure}</td>
                      <td style={{ padding:'12px 16px', textAlign:'center', fontWeight:900, color: s.inrDepreciation1pct >= 0 ? '#10B981' : '#EF4444' }}>
                        {s.inrDepreciation1pct >= 0 ? '+' : ''}{s.inrDepreciation1pct.toFixed(1)}%
                      </td>
                      <td style={{ padding:'12px 16px', textAlign:'center', fontWeight:900, color: s.inrAppreciation1pct >= 0 ? '#10B981' : '#EF4444' }}>
                        {s.inrAppreciation1pct >= 0 ? '+' : ''}{s.inrAppreciation1pct.toFixed(1)}%
                      </td>
                      <td style={{ padding:'12px 16px', textAlign:'center' }}>
                        <span style={{ fontSize:9, color:s.biasColor, background:s.biasColor + '18', border:'1px solid ' + s.biasColor + '40', padding:'4px 10px', borderRadius:999, fontWeight:700 }}>
                          {s.netBias}
                        </span>
                      </td>
                      <td style={{ padding:'12px 16px', color:'#475569', fontSize:10 }}>{s.examples.join(' · ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════ */}
      {/* E: DAILY BRIEF TAB                 */}
      {/* ═══════════════════════════════════ */}
      {tab === 'brief' && (
        <div>
          {/* DAILY BRIEF TAB */}
          <div style={{ background:'linear-gradient(135deg, #0A0F1C, #050508)', border:'1px solid #D4AF37', borderRadius:12, padding:24, marginBottom:24 }}>
            <div style={{ fontSize:10, color:'#64748B', letterSpacing:2, marginBottom:4 }}>{brief.date}</div>
            <div style={{ fontFamily:'Cinzel, Georgia', fontSize:20, color:'#D4AF37', letterSpacing:2, fontWeight:700, marginBottom:8 }}>
              📰 {brief.headline}
            </div>
            <div style={{ fontSize:10, color:'#475569', letterSpacing:1 }}>{brief.regimeLabel}</div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {brief.sections
              .filter(s => activeLens === 'All' || !s.philosopher || s.philosopher === activeLens)
              .map((s, i) => (
                <div key={i} style={{ background:'#09090F', border:'1px solid ' + (s.philosopherColor ? s.philosopherColor + '30' : '#1E293B'), borderLeft:'3px solid ' + (s.philosopherColor || '#D4AF37'), borderRadius:10, padding:18 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                    <span style={{ fontSize:18 }}>{s.icon}</span>
                    <div style={{ fontWeight:700, color: s.philosopherColor || '#D4AF37', fontSize:12 }}>{s.title}</div>
                    {s.philosopher && (
                      <span style={{ marginLeft:'auto', fontSize:9, color:s.philosopherColor, background:s.philosopherColor + '15', border:'1px solid ' + s.philosopherColor + '30', padding:'3px 8px', borderRadius:999 }}>
                        {s.philosopher}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize:11, color:'#CBD5E1', lineHeight:1.8 }}>{s.content}</div>
                </div>
              ))}
          </div>
        </div>
      )}
{/* FII / DII TAB                       */}
      {/* ═══════════════════════════════════ */}
      {tab === 'fii' && (
        <div>
          {/* SUMMARY CARDS */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:12, marginBottom:28 }}>
            {[
              { label:'FII Net (Today)',  value:`${today.fiiNet > 0 ? '+' : ''}${fmt(today.fiiNet)}`,  color: today.fiiNet > 0 ? '#10B981' : '#EF4444', sub:`Buy: ${fmt(today.fiiBuy)} | Sell: ${fmt(today.fiiSell)}` },
              { label:'DII Net (Today)',  value:`${today.diiNet > 0 ? '+' : ''}${fmt(today.diiNet)}`,  color: today.diiNet > 0 ? '#10B981' : '#EF4444', sub:`Buy: ${fmt(today.diiBuy)} | Sell: ${fmt(today.diiSell)}` },
              { label:'FII Net (5 Days)', value:`${fiiSum.fii5d > 0 ? '+' : ''}${fmt(fiiSum.fii5d)}`, color: fiiSum.fii5d > 0 ? '#10B981' : '#EF4444', sub:'Rolling 5-day net' },
              { label:'FII Net (15 Days)',value:`${fiiSum.fii15d > 0 ? '+' : ''}${fmt(fiiSum.fii15d)}`,color: fiiSum.fii15d > 0 ? '#10B981' : '#EF4444', sub:'Rolling 15-day net' },
              { label:'DII Net (5 Days)', value:`${fiiSum.dii5d > 0 ? '+' : ''}${fmt(fiiSum.dii5d)}`, color: fiiSum.dii5d > 0 ? '#10B981' : '#EF4444', sub:'Domestic support' },
              { label:'FII Buy Days',    value:`${fiiSum.fiiBuyDays} / 15`,   color:'#10B981', sub:'Last 15 sessions' },
              { label:'FII Sell Days',   value:`${fiiSum.fiiSellDays} / 15`,  color:'#EF4444', sub:'Last 15 sessions' },
            ].map(s => <StatBox key={s.label} label={s.label} value={s.value} color={s.color} sub={s.sub} />)}
          </div>

          {/* FII TREND INSIGHT */}
          <div style={{ background: fiiSum.fii5d > 0 ? '#10B98110' : '#EF444410', border:`1px solid ${fiiSum.fii5d > 0 ? '#10B98130' : '#EF444430'}`, borderRadius:8, padding:'12px 16px', marginBottom:24, fontSize:11, color: fiiSum.fii5d > 0 ? '#10B981' : '#EF4444' }}>
            {fiiSum.fii5d > 0
              ? `🟢 FIIs have been NET BUYERS for the past 5 days, pumping ${fmt(fiiSum.fii5d)} into Indian equities. Sustained buying typically signals bullish outlook for Indian markets.`
              : `🔴 FIIs have been NET SELLERS for the past 5 days, withdrawing ${fmt(Math.abs(fiiSum.fii5d))} from Indian equities. Watch for DII support and index support levels.`}
          </div>

          {/* HISTORY TABLE */}
          <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, overflow:'hidden', marginBottom:24 }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid #1E293B' }}>
              <SectionTitle emoji="🏦" title="FII / DII DAILY ACTIVITY — LAST 15 SESSIONS" />
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                <thead>
                  <tr style={{ background:'#06060D' }}>
                    {['Date','FII Buy','FII Sell','FII Net','DII Buy','DII Sell','DII Net','Nifty'].map(h => (
                      <th key={h} style={{ padding:'10px 14px', color:'#475569', fontSize:9, textAlign: h === 'Date' ? 'left' : 'right', letterSpacing:1 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FII_DII_HISTORY.map((d, i) => (
                    <tr key={d.date} style={{ borderBottom:'1px solid #0F172A', background: i % 2 === 0 ? '#09090F' : '#07070E' }}>
                      <td style={{ padding:'10px 14px', color:'#94A3B8', fontWeight:600 }}>{d.date}</td>
                      <td style={{ padding:'10px 14px', color:'#10B981', textAlign:'right' }}>{fmt(d.fiiBuy)}</td>
                      <td style={{ padding:'10px 14px', color:'#EF4444', textAlign:'right' }}>{fmt(d.fiiSell)}</td>
                      <td style={{ padding:'10px 14px', textAlign:'right', fontWeight:700 }}>
                        <span style={{ color: d.fiiNet > 0 ? '#10B981' : '#EF4444' }}>{d.fiiNet > 0 ? '+' : ''}{fmt(d.fiiNet)}</span>
                      </td>
                      <td style={{ padding:'10px 14px', color:'#10B981', textAlign:'right' }}>{fmt(d.diiBuy)}</td>
                      <td style={{ padding:'10px 14px', color:'#EF4444', textAlign:'right' }}>{fmt(d.diiSell)}</td>
                      <td style={{ padding:'10px 14px', textAlign:'right', fontWeight:700 }}>
                        <span style={{ color: d.diiNet > 0 ? '#10B981' : '#EF4444' }}>{d.diiNet > 0 ? '+' : ''}{fmt(d.diiNet)}</span>
                      </td>
                      <td style={{ padding:'10px 14px', textAlign:'right' }}>
                        <span style={{ color: d.niftyChange > 0 ? '#10B981' : '#EF4444', fontWeight:700 }}>
                          {d.niftyChange > 0 ? '▲' : '▼'} {Math.abs(d.niftyChange).toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background:'#06060D', borderTop:'2px solid #1E293B' }}>
                    <td style={{ padding:'10px 14px', color:'#F59E0B', fontWeight:700, fontSize:10 }}>15-DAY TOTAL</td>
                    <td style={{ padding:'10px 14px', color:'#10B981', textAlign:'right', fontWeight:700 }}>{fmt(FII_DII_HISTORY.reduce((s,d) => s+d.fiiBuy,  0))}</td>
                    <td style={{ padding:'10px 14px', color:'#EF4444', textAlign:'right', fontWeight:700 }}>{fmt(FII_DII_HISTORY.reduce((s,d) => s+d.fiiSell, 0))}</td>
                    <td style={{ padding:'10px 14px', textAlign:'right', fontWeight:700 }}>
                      <span style={{ color: fiiSum.fii15d > 0 ? '#10B981' : '#EF4444' }}>{fiiSum.fii15d > 0 ? '+' : ''}{fmt(fiiSum.fii15d)}</span>
                    </td>
                    <td style={{ padding:'10px 14px', color:'#10B981', textAlign:'right', fontWeight:700 }}>{fmt(FII_DII_HISTORY.reduce((s,d) => s+d.diiBuy,  0))}</td>
                    <td style={{ padding:'10px 14px', color:'#EF4444', textAlign:'right', fontWeight:700 }}>{fmt(FII_DII_HISTORY.reduce((s,d) => s+d.diiSell, 0))}</td>
                    <td style={{ padding:'10px 14px', textAlign:'right', fontWeight:700 }}>
                      <span style={{ color: fiiSum.dii15d > 0 ? '#10B981' : '#EF4444' }}>{fiiSum.dii15d > 0 ? '+' : ''}{fmt(fiiSum.dii15d)}</span>
                    </td>
                    <td style={{ padding:'10px 14px', textAlign:'right', color:'#475569', fontSize:9 }}>15 sessions</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* FII BAR CHART — visual bars */}
          <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, padding:20 }}>
            <SectionTitle emoji="📊" title="FII NET FLOW TREND" />
            <div style={{ display:'flex', gap:6, alignItems:'flex-end', height:140, marginBottom:8 }}>
              {FII_DII_HISTORY.slice(0,10).reverse().map(d => {
                const max  = 10000;
                const pct  = Math.min(100, (Math.abs(d.fiiNet) / max) * 100);
                const pos  = d.fiiNet > 0;
                return (
                  <div key={d.date} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', height:'100%', justifyContent:'flex-end' }}>
                    {pos && <div style={{ width:'100%', background:'#10B981', borderRadius:'3px 3px 0 0', height:`${pct}%`, minHeight:4 }}/>}
                    <div style={{ height:2, background:'#1E293B', width:'100%' }}/>
                    {!pos && <div style={{ width:'100%', background:'#EF4444', borderRadius:'0 0 3px 3px', height:`${pct}%`, minHeight:4 }}/>}
                  </div>
                );
              })}
            </div>
            <div style={{ display:'flex', gap:6 }}>
              {FII_DII_HISTORY.slice(0,10).reverse().map(d => (
                <div key={d.date} style={{ flex:1, textAlign:'center', fontSize:7, color:'#334155' }}>{d.date.split(' ')[0]}</div>
              ))}
            </div>
            <div style={{ display:'flex', gap:16, marginTop:12, fontSize:9, color:'#475569' }}>
              <span>🟢 Net buying</span>
              <span>🔴 Net selling</span>
              <span style={{ marginLeft:'auto' }}>Bar height = magnitude</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════ */}
      {/* BREADTH TAB                         */}
      {/* ═══════════════════════════════════ */}
      {tab === 'breadth' && (
        <div>
          {/* BREADTH INDICATORS */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:12, marginBottom:24 }}>
            {[
              { label:'A/D Line',          value: MARKET_BREADTH.advanceDeclineRatio.toFixed(2),  color: MARKET_BREADTH.advanceDeclineRatio > 1.5 ? '#10B981' : '#F59E0B', sub:'Ratio > 1.5 = Strong' },
              { label:'McClellan Osc.',    value: MARKET_BREADTH.mcclellanOscillator.toFixed(1),  color: MARKET_BREADTH.mcclellanOscillator > 0 ? '#10B981' : '#EF4444', sub:'> 0 = Breadth expanding' },
              { label:'% Bullish (P&F)',   value: MARKET_BREADTH.bullishPct.toFixed(1) + '%',     color: MARKET_BREADTH.bullishPct > 60 ? '#10B981' : '#F59E0B', sub:'> 60% = Bull market' },
              { label:'52W Highs',         value: MARKET_BREADTH.newHighs52w.toString(),           color:'#10B981', sub:'New yearly highs' },
              { label:'52W Lows',          value: MARKET_BREADTH.newLows52w.toString(),            color:'#EF4444', sub:'New yearly lows' },
              { label:'Above 200 SMA',     value: MARKET_BREADTH.aboveSMA200.toString(),           color:'#10B981', sub:`of ${MARKET_BREADTH.total} stocks` },
              { label:'Below 200 SMA',     value: MARKET_BREADTH.belowSMA200.toString(),           color:'#EF4444', sub:'Long-term downtrend' },
              { label:'Put/Call Ratio',    value: MARKET_BREADTH.putCallRatio.toFixed(2),          color: MARKET_BREADTH.putCallRatio > 1 ? '#10B981' : MARKET_BREADTH.putCallRatio < 0.7 ? '#EF4444' : '#F59E0B', sub:'> 1.0 = Oversold' },
            ].map(s => <StatBox key={s.label} label={s.label} value={s.value} color={s.color} sub={s.sub} />)}
          </div>

          {/* SECTOR BREADTH TABLE */}
          <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, overflow:'hidden', marginBottom:24 }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid #1E293B' }}>
              <SectionTitle emoji="📈" title="SECTOR-WISE BREADTH" />
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                <thead>
                  <tr style={{ background:'#06060D' }}>
                    {['Sector','▲ Up','▼ Down','= Flat','Total','A/D Ratio','Top Gainer','Top Loser','Net Chg'].map(h => (
                      <th key={h} style={{ padding:'10px 14px', color:'#475569', fontSize:9, textAlign: h === 'Sector' ? 'left' : 'right', letterSpacing:1 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SECTOR_BREADTH.map((s, i) => {
                    const adRatio = (s.advances / Math.max(s.declines, 1)).toFixed(2);
                    return (
                      <tr key={s.sector} style={{ borderBottom:'1px solid #0F172A', background: i % 2 === 0 ? '#09090F' : '#07070E' }}>
                        <td style={{ padding:'10px 14px', color:'#F1F5F9', fontWeight:600 }}>{s.sector}</td>
                        <td style={{ padding:'10px 14px', color:'#10B981', textAlign:'right', fontWeight:700 }}>{s.advances}</td>
                        <td style={{ padding:'10px 14px', color:'#EF4444', textAlign:'right', fontWeight:700 }}>{s.declines}</td>
                        <td style={{ padding:'10px 14px', color:'#818CF8', textAlign:'right' }}>{s.unchanged}</td>
                        <td style={{ padding:'10px 14px', color:'#475569', textAlign:'right' }}>{s.total}</td>
                        <td style={{ padding:'10px 14px', textAlign:'right' }}>
                          <span style={{ color: parseFloat(adRatio) > 1 ? '#10B981' : '#EF4444', fontWeight:700 }}>{adRatio}</span>
                        </td>
                        <td style={{ padding:'10px 14px', textAlign:'right' }}>
                          <span style={{ color:'#10B981', fontSize:10 }}>{s.topGainer} +{s.topGainerPct}%</span>
                        </td>
                        <td style={{ padding:'10px 14px', textAlign:'right' }}>
                          <span style={{ color:'#EF4444', fontSize:10 }}>{s.topLoser} {s.topLoserPct}%</span>
                        </td>
                        <td style={{ padding:'10px 14px', textAlign:'right', fontWeight:700 }}>
                          <span style={{ color: s.netChange > 0 ? '#10B981' : '#EF4444' }}>{s.netChange > 0 ? '+' : ''}{s.netChange.toFixed(1)}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* BREADTH INTERPRETATION */}
          <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, padding:20 }}>
            <SectionTitle emoji="🧠" title="BREADTH INTERPRETATION" />
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:12 }}>
              {[
                { title:'A/D Ratio 1.52', signal:'BULLISH', desc:'More than 1.5x more stocks advancing than declining. Strong broad-based buying across the market.', color:'#10B981' },
                { title:'McClellan +42.8', signal:'BULLISH', desc:'Positive oscillator indicates breadth is expanding. Historically precedes further market gains of 1-3%.', color:'#10B981' },
                { title:'Bullish % 61.5%', signal:'BULLISH', desc:'Over 60% of stocks on Point & Figure buy signals. Confirms bull market conditions with room for further gains.', color:'#10B981' },
                { title:'P/C Ratio 0.82', signal:'NEUTRAL', desc:'Below 1.0 suggests more call buying than put buying. Market not excessively fearful but not greedy either.', color:'#F59E0B' },
                { title:'VIX 13.84', signal:'CALM', desc:'Fear index well below 20. Low volatility environment favors momentum strategies and trend-following.', color:'#10B981' },
                { title:'52W Highs 84 vs Lows 23', signal:'BULLISH', desc:'Significantly more new highs than lows. Internal market strength confirms index-level bullish bias.', color:'#10B981' },
              ].map(item => (
                <div key={item.title} style={{ background:'#050508', borderRadius:8, padding:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                    <span style={{ fontSize:11, color:'#F1F5F9', fontWeight:700 }}>{item.title}</span>
                    <span style={{ fontSize:8, color:item.color, background:`${item.color}15`, borderRadius:4, padding:'2px 8px', fontWeight:700 }}>{item.signal}</span>
                  </div>
                  <div style={{ fontSize:10, color:'#64748B', lineHeight:1.6 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════ */}
      {/* DERIVATIVES TAB                     */}
      {/* ═══════════════════════════════════ */}
      {tab === 'derivatives' && (
        <div>
          {/* FUTURES SNAPSHOT */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:12, marginBottom:24 }}>
            {[
              { label:'Nifty Future',         value: DERIVATIVES.niftyFuturePrice.toLocaleString(),     color:'#F1F5F9', sub:`Premium: +${DERIVATIVES.niftyFuturePremium} pts` },
              { label:'Bank Nifty Future',    value: DERIVATIVES.bankNiftyFuturePrice.toLocaleString(), color:'#F1F5F9', sub:`Premium: +${DERIVATIVES.bankNiftyFuturePremium} pts` },
              { label:'Nifty PCR',            value: DERIVATIVES.niftyPCR.toFixed(2),   color: DERIVATIVES.niftyPCR > 1 ? '#10B981' : '#F59E0B', sub:'< 0.8 Bearish' },
              { label:'BankNifty PCR',        value: DERIVATIVES.bankNiftyPCR.toFixed(2),color: DERIVATIVES.bankNiftyPCR > 1 ? '#10B981' : '#F59E0B', sub:'Put/Call OI ratio' },
              { label:'Max Call OI Strike',   value: DERIVATIVES.maxCallOIStrike.toLocaleString(), color:'#EF4444', sub:'Resistance wall' },
              { label:'Max Put OI Strike',    value: DERIVATIVES.maxPutOIStrike.toLocaleString(),  color:'#10B981', sub:'Support floor' },
              { label:'Implied Move',         value: '±' + DERIVATIVES.impliedMove + '%', color:'#818CF8', sub:'Weekly expected range' },
              { label:'India VIX',            value: DERIVATIVES.vix.toFixed(2), color: DERIVATIVES.vix < 15 ? '#10B981' : '#EF4444', sub:`${DERIVATIVES.vixChange}% change` },
            ].map(s => <StatBox key={s.label} label={s.label} value={s.value} color={s.color} sub={s.sub} />)}
          </div>

          {/* KEY LEVELS INSIGHT */}
          <div style={{ background:'#09090F', border:'1px solid #F59E0B30', borderRadius:10, padding:16, marginBottom:24 }}>
            <div style={{ fontSize:10, color:'#F59E0B', fontWeight:700, letterSpacing:1, marginBottom:10 }}>⚡ KEY OPTIONS LEVELS</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div style={{ background:'#10B98115', border:'1px solid #10B98130', borderRadius:8, padding:12 }}>
                <div style={{ fontSize:9, color:'#10B981', marginBottom:4 }}>🟢 SUPPORT (Max Put OI)</div>
                <div style={{ fontSize:20, color:'#10B981', fontWeight:700 }}>{DERIVATIVES.maxPutOIStrike.toLocaleString()}</div>
                <div style={{ fontSize:9, color:'#475569', marginTop:4 }}>Strong floor — put writers will defend this level</div>
              </div>
              <div style={{ background:'#EF444415', border:'1px solid #EF444430', borderRadius:8, padding:12 }}>
                <div style={{ fontSize:9, color:'#EF4444', marginBottom:4 }}>🔴 RESISTANCE (Max Call OI)</div>
                <div style={{ fontSize:20, color:'#EF4444', fontWeight:700 }}>{DERIVATIVES.maxCallOIStrike.toLocaleString()}</div>
                <div style={{ fontSize:9, color:'#475569', marginTop:4 }}>Call writers will resist breakout — key level to watch</div>
              </div>
            </div>
          </div>

          {/* OPTIONS CHAIN */}
          <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid #1E293B' }}>
              <SectionTitle emoji="⚙️" title="NIFTY OPTIONS CHAIN — CURRENT EXPIRY" />
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                <thead>
                  <tr style={{ background:'#06060D' }}>
                    <th colSpan={3} style={{ padding:'8px 14px', color:'#10B981', fontSize:9, textAlign:'center', borderRight:'1px solid #1E293B' }}>— CALLS —</th>
                    <th style={{ padding:'8px 14px', color:'#F59E0B', fontSize:9, textAlign:'center' }}>STRIKE</th>
                    <th colSpan={3} style={{ padding:'8px 14px', color:'#EF4444', fontSize:9, textAlign:'center', borderLeft:'1px solid #1E293B' }}>— PUTS —</th>
                  </tr>
                  <tr style={{ background:'#06060D', borderBottom:'1px solid #1E293B' }}>
                    <th style={{ padding:'8px 14px', color:'#475569', fontSize:8, textAlign:'right' }}>OI Chg</th>
                    <th style={{ padding:'8px 14px', color:'#475569', fontSize:8, textAlign:'right' }}>OI</th>
                    <th style={{ padding:'8px 14px', color:'#475569', fontSize:8, textAlign:'right' }}>LTP</th>
                    <th style={{ padding:'8px 14px', color:'#F59E0B', fontSize:9, textAlign:'center', fontWeight:700 }}>STRIKE</th>
                    <th style={{ padding:'8px 14px', color:'#475569', fontSize:8, textAlign:'left' }}>LTP</th>
                    <th style={{ padding:'8px 14px', color:'#475569', fontSize:8, textAlign:'left' }}>OI</th>
                    <th style={{ padding:'8px 14px', color:'#475569', fontSize:8, textAlign:'left' }}>OI Chg</th>
                  </tr>
                </thead>
                <tbody>
                  {OPTIONS_CHAIN.map((opt, i) => (
                    <tr key={opt.strike} style={{ borderBottom:'1px solid #0F172A', background: opt.isATM ? '#F59E0B08' : i % 2 === 0 ? '#09090F' : '#07070E' }}>
                      <td style={{ padding:'9px 14px', textAlign:'right', color: opt.callOIChange > 0 ? '#10B981' : '#EF4444', fontSize:10 }}>
                        {opt.callOIChange > 0 ? '+' : ''}{(opt.callOIChange/1000).toFixed(0)}K
                      </td>
                      <td style={{ padding:'9px 14px', textAlign:'right', color:'#94A3B8' }}>
                        <span style={{ fontSize:10 }}>{(opt.callOI/100000).toFixed(1)}L</span>
                        <div style={{ width:40, height:4, background:'#1E293B', borderRadius:2, marginTop:3, marginLeft:'auto' }}>
                          <div style={{ width:`${Math.min(100,(opt.callOI/15000)*100)}%`, height:'100%', background:'#10B981', borderRadius:2 }}/>
                        </div>
                      </td>
                      <td style={{ padding:'9px 14px', textAlign:'right', color:'#10B981', fontWeight:700 }}>{opt.callLTP.toFixed(1)}</td>
                      <td style={{ padding:'9px 14px', textAlign:'center', fontWeight:700, color: opt.isATM ? '#F59E0B' : '#F1F5F9', fontSize: opt.isATM ? 13 : 11, background: opt.isATM ? '#F59E0B10' : 'transparent' }}>
                        {opt.strike.toLocaleString()}
                        {opt.isATM && <span style={{ fontSize:7, color:'#F59E0B', marginLeft:4 }}>ATM</span>}
                      </td>
                      <td style={{ padding:'9px 14px', color:'#EF4444', fontWeight:700 }}>{opt.putLTP.toFixed(1)}</td>
                      <td style={{ padding:'9px 14px', color:'#94A3B8' }}>
                        <span style={{ fontSize:10 }}>{(opt.putOI/100000).toFixed(1)}L</span>
                        <div style={{ width:40, height:4, background:'#1E293B', borderRadius:2, marginTop:3 }}>
                          <div style={{ width:`${Math.min(100,(opt.putOI/15000)*100)}%`, height:'100%', background:'#EF4444', borderRadius:2 }}/>
                        </div>
                      </td>
                      <td style={{ padding:'9px 14px', color: opt.putOIChange > 0 ? '#EF4444' : '#10B981', fontSize:10 }}>
                        {opt.putOIChange > 0 ? '+' : ''}{(opt.putOIChange/1000).toFixed(0)}K
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════ */}
      {/* MOVERS TAB                          */}
      {/* ═══════════════════════════════════ */}
      {tab === 'movers' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
          {/* TOP GAINERS */}
          <div style={{ background:'#09090F', border:'1px solid #10B98130', borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'14px 16px', borderBottom:'1px solid #1E293B', background:'#10B98108' }}>
              <SectionTitle emoji="🚀" title="TOP GAINERS" color="#10B981" />
            </div>
            {TOP_GAINERS.map((s, i) => (
              <div key={s.symbol} style={{ padding:'14px 16px', borderBottom:'1px solid #0F172A', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                  <span style={{ fontSize:12, color:'#334155' }}>#{i+1}</span>
                  <div>
                    <div style={{ fontSize:12, color:'#F59E0B', fontWeight:700 }}>{s.symbol}</div>
                    <div style={{ fontSize:9, color:'#475569', marginTop:2 }}>{s.sector}</div>
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:13, color:'#F1F5F9', fontWeight:700 }}>{s.price.toLocaleString()}</div>
                  <div style={{ fontSize:11, color:'#10B981', fontWeight:700 }}>▲ +{s.changePct.toFixed(2)}%</div>
                  <div style={{ fontSize:8, color:'#334155', marginTop:2 }}>Vol: {fmtVol(s.volume)} ({s.volumeRatio}x avg)</div>
                </div>
              </div>
            ))}
          </div>

          {/* TOP LOSERS */}
          <div style={{ background:'#09090F', border:'1px solid #EF444430', borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'14px 16px', borderBottom:'1px solid #1E293B', background:'#EF444408' }}>
              <SectionTitle emoji="📉" title="TOP LOSERS" color="#EF4444" />
            </div>
            {TOP_LOSERS.map((s, i) => (
              <div key={s.symbol} style={{ padding:'14px 16px', borderBottom:'1px solid #0F172A', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                  <span style={{ fontSize:12, color:'#334155' }}>#{i+1}</span>
                  <div>
                    <div style={{ fontSize:12, color:'#F59E0B', fontWeight:700 }}>{s.symbol}</div>
                    <div style={{ fontSize:9, color:'#475569', marginTop:2 }}>{s.sector}</div>
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:13, color:'#F1F5F9', fontWeight:700 }}>{s.price.toLocaleString()}</div>
                  <div style={{ fontSize:11, color:'#EF4444', fontWeight:700 }}>▼ {s.changePct.toFixed(2)}%</div>
                  <div style={{ fontSize:8, color:'#334155', marginTop:2 }}>Vol: {fmtVol(s.volume)} ({s.volumeRatio}x avg)</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════ */}
      {/* BLOCK DEALS TAB                     */}
      {/* ═══════════════════════════════════ */}
      {tab === 'blocks' && (
        <div>
          <div style={{ background:'#F59E0B10', border:'1px solid #F59E0B30', borderRadius:8, padding:'10px 16px', marginBottom:20, fontSize:11, color:'#F59E0B' }}>
            💎 Block deals are large institutional trades (&gt; 500 Cr or 500K shares). They signal strong conviction from smart money.
          </div>
          <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, overflow:'hidden' }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                <thead>
                  <tr style={{ background:'#06060D' }}>
                    {['Time','Symbol','Company','Quantity','Price','Value (Cr)','Side','Client'].map(h => (
                      <th key={h} style={{ padding:'10px 14px', color:'#475569', fontSize:9, textAlign: h === 'Company' || h === 'Client' ? 'left' : 'right', letterSpacing:1 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BLOCK_DEALS.map((d, i) => (
                    <tr key={i} style={{ borderBottom:'1px solid #0F172A', background: i % 2 === 0 ? '#09090F' : '#07070E' }}>
                      <td style={{ padding:'11px 14px', color:'#64748B', textAlign:'right' }}>{d.time}</td>
                      <td style={{ padding:'11px 14px', color:'#F59E0B', fontWeight:700, textAlign:'right' }}>{d.symbol}</td>
                      <td style={{ padding:'11px 14px', color:'#94A3B8' }}>{d.name}</td>
                      <td style={{ padding:'11px 14px', color:'#94A3B8', textAlign:'right' }}>{fmtVol(d.qty)}</td>
                      <td style={{ padding:'11px 14px', color:'#F1F5F9', textAlign:'right', fontWeight:600 }}>{d.price.toLocaleString()}</td>
                      <td style={{ padding:'11px 14px', textAlign:'right', fontWeight:700 }}>
                        <span style={{ color:'#F59E0B' }}>{d.value.toFixed(1)} Cr</span>
                      </td>
                      <td style={{ padding:'11px 14px', textAlign:'right' }}>
                        <span style={{ background: d.side === 'BUY' ? '#10B98120' : '#EF444420', border:`1px solid ${d.side === 'BUY' ? '#10B98140' : '#EF444440'}`, color: d.side === 'BUY' ? '#10B981' : '#EF4444', borderRadius:4, padding:'3px 10px', fontSize:9, fontWeight:700 }}>
                          {d.side === 'BUY' ? '▲ BUY' : '▼ SELL'}
                        </span>
                      </td>
                      <td style={{ padding:'11px 14px', color:'#64748B', fontSize:10 }}>{d.client}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background:'#06060D', borderTop:'2px solid #1E293B' }}>
                    <td colSpan={5} style={{ padding:'10px 14px', color:'#F59E0B', fontWeight:700, fontSize:10 }}>TOTAL BLOCK DEAL VALUE</td>
                    <td style={{ padding:'10px 14px', textAlign:'right', fontWeight:700, color:'#F59E0B' }}>
                      {BLOCK_DEALS.reduce((s,d) => s + d.value, 0).toFixed(1)} Cr
                    </td>
                    <td colSpan={2} style={{ padding:'10px 14px', textAlign:'right', fontSize:9, color:'#475569' }}>
                      Buy: {BLOCK_DEALS.filter(d => d.side === 'BUY').length} | Sell: {BLOCK_DEALS.filter(d => d.side === 'SELL').length}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div style={{ textAlign:'center', fontSize:9, color:'#0F172A', letterSpacing:1, marginTop:32, paddingTop:16, borderTop:'1px solid #0F172A' }}>
        NOT INVESTMENT ADVICE · EDUCATIONAL SIMULATION · RISHI TERMINAL v4.0
      </div>
    </div>
  );
}
