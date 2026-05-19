// components/stock/PriceChart.tsx
// TOOLTIP_CHART_V2
'use client';

import React, { useState } from 'react';
import { Stock } from '../../lib/types';
import { usePriceHistory, type Timeframe, type PricePoint } from '../../hooks/usePriceHistory';

interface Props { stock: Stock; }
// ── TIMEFRAMES ──────────────────────────────────────────────
const TIMEFRAMES: Timeframe[] = ['1D','1W','1M','3M','6M','1Y','3Y','5Y','MAX'];
const TF_LABEL: Record<Timeframe,string> = {
  '1D':'1 Day','1W':'1 Week','1M':'1 Month','3M':'3 Months',
  '6M':'6 Months','1Y':'1 Year','3Y':'3 Years','5Y':'5 Years','MAX':'All Time',
};

// ── TOOLTIP STATE ───────────────────────────────────────────
interface TooltipState { x: number; y: number; price: number; date: string; visible: boolean; }

// ── SVG LINE CHART WITH TOOLTIP ─────────────────────────────
function LineChart({ points, positive }: { points: PricePoint[]; positive: boolean }) {
  const [tip, setTip] = React.useState<TooltipState>({ x:0, y:0, price:0, date:'', visible:false });

  if (!points || points.length < 2) return null;

  const W=900; const H=220;
  const PAD={ t:16, r:8, b:24, l:64 };
  const cW=W-PAD.l-PAD.r; const cH=H-PAD.t-PAD.b;

  const vals  = points.map(p=>p.v);
  const times = points.map(p=>p.t);
  const vMin  = Math.min(...vals); const vMax=Math.max(...vals);
  const tMin  = Math.min(...times); const tMax=Math.max(...times);
  const vRange= vMax-vMin||1; const tRange=tMax-tMin||1;

  const px=(t:number)=>PAD.l+((t-tMin)/tRange)*cW;
  const py=(v:number)=>PAD.t+cH-((v-vMin)/vRange)*cH;

  const linePts  = points.map(p=>`${px(p.t).toFixed(1)},${py(p.v).toFixed(1)}`).join(' ');
  const areaPath = [
    `M ${px(times[0]).toFixed(1)},${(PAD.t+cH).toFixed(1)}`,
    ...points.map(p=>`L ${px(p.t).toFixed(1)},${py(p.v).toFixed(1)}`),
    `L ${px(times[times.length-1]).toFixed(1)},${(PAD.t+cH).toFixed(1)}`,
    'Z',
  ].join(' ');

  const color  = positive ? '#22C55E' : '#EF4444';
  const fillId = `cf_${positive?'g':'r'}_${Math.abs(points.length)}`;

  const yTicks = Array.from({length:5},(_,i)=>{
    const v=vMin+(vRange/4)*i;
    return { y:py(v), label: v>=10000 ? v.toLocaleString('en-IN',{maximumFractionDigits:0}) : v>=1000 ? v.toLocaleString('en-IN',{maximumFractionDigits:0}) : v.toFixed(2) };
  });

  const xTicks = Array.from({length:5},(_,i)=>{
    const t=tMin+(tRange/4)*i;
    return { x:px(t), label:new Date(t).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) };
  });

  // Convert SVG coords to nearest data point for tooltip
  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * W;
    const rawY = ((e.clientY - rect.top) / rect.height) * H;

    // Find closest point by X
    const tCursor = ((rawX - PAD.l) / cW) * tRange + tMin;
    let best = points[0]; let bestDiff = Infinity;
    for (const p of points) {
      const d = Math.abs(p.t - tCursor);
      if (d < bestDiff) { bestDiff=d; best=p; }
    }

    const snapX = px(best.t);
    const snapY = py(best.v);
    const dateStr = new Date(best.t).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
    const priceStr = best.v >= 1000
      ? best.v.toLocaleString('en-IN',{maximumFractionDigits:2})
      : best.v.toFixed(4);

    setTip({ x:snapX, y:snapY, price:best.v, date:dateStr, visible:true });
  }

  function handleMouseLeave() { setTip(t=>({...t,visible:false})); }

  // Tooltip position (keep inside SVG bounds)
  const tipW=160; const tipH=44;
  const tipX = tip.x + tipW + 16 > W ? tip.x - tipW - 8 : tip.x + 12;
  const tipY = tip.y - tipH/2 < 0 ? 4 : tip.y + tipH/2 > H ? H - tipH - 4 : tip.y - tipH/2;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width:'100%', height:'100%', overflow:'visible', cursor:'crosshair' }}
      preserveAspectRatio="none"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.22"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.01"/>
        </linearGradient>
      </defs>

      {/* Y grid + labels */}
      {yTicks.map((tk,i)=>(
        <g key={i}>
          <line x1={PAD.l} y1={tk.y} x2={W-PAD.r} y2={tk.y}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
          <text x={PAD.l-6} y={tk.y+4} textAnchor="end"
            fill="rgba(148,163,184,0.75)" fontSize="10" fontFamily="monospace">
            {tk.label}
          </text>
        </g>
      ))}

      {/* X labels */}
      {xTicks.map((tk,i)=>(
        <text key={i} x={tk.x} y={H-4} textAnchor="middle"
          fill="rgba(148,163,184,0.65)" fontSize="9" fontFamily="monospace">
          {tk.label}
        </text>
      ))}

      {/* Area */}
      <path d={areaPath} fill={`url(#${fillId})`}/>

      {/* Line */}
      <polyline points={linePts} fill="none" stroke={color}
        strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>

      {/* Last dot */}
      <circle cx={px(times[times.length-1])} cy={py(vals[vals.length-1])}
        r="3.5" fill={color} stroke="#0A0F1C" strokeWidth="1.5"/>

      {/* Crosshair */}
      {tip.visible && (
        <>
          <line x1={tip.x} y1={PAD.t} x2={tip.x} y2={PAD.t+cH}
            stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3"/>
          <line x1={PAD.l} y1={tip.y} x2={W-PAD.r} y2={tip.y}
            stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="3 3"/>
          <circle cx={tip.x} cy={tip.y} r="4.5" fill={color} stroke="#0A0F1C" strokeWidth="2"/>

          {/* Tooltip box */}
          <rect x={tipX} y={tipY} width={tipW} height={tipH}
            rx="6" fill="#111827" stroke="rgba(212,175,55,0.4)" strokeWidth="1"
            filter="drop-shadow(0 2px 8px rgba(0,0,0,0.6))"/>
          <text x={tipX+10} y={tipY+16} fill="rgba(148,163,184,0.8)" fontSize="9" fontFamily="monospace">
            {tip.date}
          </text>
          <text x={tipX+10} y={tipY+33} fill="#D4AF37" fontSize="13" fontWeight="700" fontFamily="monospace">
            {tip.price >= 1000
              ? tip.price.toLocaleString('en-IN',{maximumFractionDigits:2})
              : tip.price.toFixed(4)}
          </text>
        </>
      )}
    </svg>
  );
}
export function PriceChart({ stock }: Props) {
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
          <div style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:'0.1em', fontFamily:'Cinzel,serif', marginBottom:8 }}>PRICE CHART</div>
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
        {!loading && error && <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--accent-red)',fontSize:11,fontFamily:'monospace' }}>Failed to load data</div>}
        {!loading && !error && points.length>=2 && <LineChart points={points} positive={pos}/>}
        {!loading && !error && points.length<2 && <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-muted)',fontSize:11 }}>No data for this period</div>}
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8 }}>
        <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'monospace' }}>Source: {source??'—'} · {points.length} pts · Hover to inspect</span>
        <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'monospace' }}>AO · Not investment advice</span>
      </div>
    </div>
  );
}
