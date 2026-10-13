// components/stock/PriceChart.tsx
// TOOLTIP_CHART_V2 → LWC-CHART (round 56): the series renderer is now
// tradingview/lightweight-charts (Apache-2.0) per the founder's batch-2
// adoption order (docs/evidence/round55/r55-batch2-adoption-record.md),
// dynamically imported so the library stays out of the first-load bundle
// (the bundle-ratchet baseline is untouched — C9 paired guard). The shell
// keeps every existing affordance: timeframes, fetched-series header,
// source line, honest loading/error/no-data states, "AO · Not investment
// advice". NEW per the adoption condition: the TradingView attribution
// (NOTICE text + link) renders in the card footer on every render —
// wherever the chart renders — pinned by
// test/stockPriceChartAttribution.test.ts.
'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '../../lib/language';
import { Stock } from '../../lib/types';
import { usePriceHistory, type Timeframe } from '../../hooks/usePriceHistory';

// The lightweight-charts adapter loads as an async chunk after hydration —
// never in the first-load script tags.
const LwcSeriesChart = dynamic(
  () => import('./LwcSeriesChart').then((m) => m.LwcSeriesChart),
  { ssr: false },
);

interface Props { stock: Stock; }
// ── TIMEFRAMES ──────────────────────────────────────────────
const TIMEFRAMES: Timeframe[] = ['1D','1W','1M','3M','6M','1Y','3Y','5Y','MAX'];
const TF_LABEL: Record<Timeframe,string> = {
  '1D':'1 Day','1W':'1 Week','1M':'1 Month','3M':'3 Months',
  '6M':'6 Months','1Y':'1 Year','3Y':'3 Years','5Y':'5 Years','MAX':'All Time',
};

export function PriceChart({ stock }: Props) {
  const { t } = useLanguage();
  const [tf, setTf] = useState<Timeframe>('1M');
  const { points, loading, error, source } = usePriceHistory(stock?.symbol ?? '', tf);
  if (!stock || !stock.price) return null;

  const first  = points[0]?.v ?? stock.price;
  const last   = points[points.length-1]?.v ?? stock.price;
  const change = first > 0 ? ((last-first)/first)*100 : 0;
  const pos    = change >= 0;

  return (
    <div className="card-sacred p-6">
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:'0.1em', fontFamily:'Cinzel,serif', marginBottom:8 }}>{t("chart.priceChart")}</div>
          <div style={{ fontSize:36, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:'var(--text-primary)' }}>
            {loading ? stock.price.toLocaleString('en-IN') : last.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize:13, fontFamily:'monospace', marginTop:6, color: pos ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {loading ? 'Loading…' : `${pos?'▲':'▼'} ${Math.abs(change).toFixed(2)}% (${TF_LABEL[tf]})`}
          </div>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {TIMEFRAMES.map(t=>(
            <button key={t} onClick={()=>setTf(t)} style={{
              padding:'5px 10px', fontSize:10, fontFamily:'monospace', borderRadius:6,
              border: tf===t ? '1px solid var(--accent-gold)' : '1px solid var(--border-primary)',
              background: tf===t ? 'rgba(255,215,0,0.15)' : 'transparent',
              color: tf===t ? 'var(--accent-gold)' : 'var(--text-muted)',
              cursor:'pointer', transition:'all 0.15s',
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ height:240, background:'rgba(255,255,255,0.02)', borderRadius:8, border:'1px solid var(--border-subtle)', position:'relative', overflow:'hidden' }}>
        {loading && <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-muted)',fontSize:12,fontFamily:'monospace' }}>Loading…</div>}
        {!loading && error && <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--accent-red)',fontSize:11,fontFamily:'monospace' }}>{t("chart.loadFailed")}</div>}
        {!loading && !error && points.length>=2 && <LwcSeriesChart points={points} positive={pos} />}
        {!loading && !error && points.length<2 && <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-muted)',fontSize:11 }}>{t("chart.noData")}</div>}
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8, flexWrap:'wrap', gap:4 }}>
        <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'monospace' }}>Source: {source??'—'} · {points.length} pts · Hover to inspect</span>
        <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'monospace' }}>AO · Not investment advice</span>
      </div>
      <div style={{ marginTop:4 }}>
        <a
          href="https://www.tradingview.com/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'monospace', textDecoration:'underline' }}
        >
          TradingView Lightweight Charts™ · Copyright (с) 2025 TradingView, Inc.
        </a>
      </div>
    </div>
  );
}
