'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { STOCKS } from '../../../data/stocks';
import { getStockDetail } from '../../../data/stockDetails';
import { scoreJhunjhunwala, scoreDamani, scoreBuffett, scoreGraham, scoreLynch, scoreKacholia, scoreKedia, scoreMunger, scoreGreenblatt, scorePabrai } from '../../../lib/scorers';
import { sc, getSig } from '../../../lib/utils';

const SCORERS = [
  { name:'Jhunjhunwala', fn:scoreJhunjhunwala, origin:'Bharat' },
  { name:'Damani',       fn:scoreDamani,       origin:'Bharat' },
  { name:'Kacholia',     fn:scoreKacholia,     origin:'Bharat' },
  { name:'Kedia',        fn:scoreKedia,        origin:'Bharat' },
  { name:'Pabrai',       fn:scorePabrai,       origin:'Bharat' },
  { name:'Buffett',      fn:scoreBuffett,       origin:'Global' },
  { name:'Graham',       fn:scoreGraham,        origin:'Global' },
  { name:'Lynch',        fn:scoreLynch,         origin:'Global' },
  { name:'Greenblatt',   fn:scoreGreenblatt,    origin:'Global' },
  { name:'Munger',       fn:scoreMunger,        origin:'Global' },
];

type Tab = 'overview' | 'financials' | 'technicals' | 'shareholding' | 'peers' | 'analysts' | 'rishi';

function sigColor(s: string) {
  if (s === 'BUY')   return '#10B981';
  if (s === 'SELL')  return '#EF4444';
  return '#F59E0B';
}

function ratingColor(r: string) {
  if (r === 'BUY' || r === 'OUTPERFORM') return '#10B981';
  if (r === 'SELL' || r === 'UNDERPERFORM') return '#EF4444';
  return '#F59E0B';
}

function MetricBox({ label, value, sub, color, border }: {
  label:string; value:string; sub?:string; color?:string; border?:string;
}) {
  return (
    <div style={{ background:'#09090F', border:`1px solid ${border || '#1E293B'}`, borderRadius:10, padding:'14px 16px' }}>
      <div style={{ fontSize:8, color:'#475569', letterSpacing:1, marginBottom:6, textTransform:'uppercase' }}>{label}</div>
      <div style={{ fontSize:18, fontWeight:700, color: color || '#F1F5F9', fontFamily:'JetBrains Mono, monospace' }}>{value}</div>
      {sub && <div style={{ fontSize:9, color:'#334155', marginTop:4 }}>{sub}</div>}
    </div>
  );
}

export default function StockPage() {
  const { symbol } = useParams();
  const sym = (Array.isArray(symbol) ? symbol[0] : symbol) as string;
  const [tab, setTab] = useState<Tab>('overview');

  const stock  = STOCKS[sym as keyof typeof STOCKS];
  const detail = getStockDetail(sym);

  if (!stock) {
    return (
      <div style={{ fontFamily:'JetBrains Mono, monospace', background:'#050508', color:'#E2E8F0', minHeight:'100vh', padding:40, textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:16 }}>❌</div>
        <div style={{ fontSize:18, color:'#EF4444', marginBottom:8 }}>Stock not found: {sym}</div>
        <Link href="/screener" style={{ color:'#F59E0B', textDecoration:'none' }}>← Back to Screener</Link>
      </div>
    );
  }

  const scores      = SCORERS.map(s => ({ ...s, score: s.fn(stock).score }));
  const composite   = Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length);
  const signal      = getSig(composite);
  const changeAmt   = detail ? (detail.cmp - detail.prevClose).toFixed(2) : '0';
  const changePct   = detail ? (((detail.cmp - detail.prevClose) / detail.prevClose) * 100).toFixed(2) : '0';
  const isPos       = detail ? detail.cmp >= detail.prevClose : true;
  const cmp         = detail ? detail.cmp : stock.price;
  const high52w     = detail ? detail.high52w : stock.price * 1.15;
  const low52w      = detail ? detail.low52w  : stock.price * 0.85;
  const rangePct    = ((cmp - low52w) / (high52w - low52w)) * 100;

  const tabs: { key: Tab; label: string; emoji: string }[] = [
    { key:'overview',     label:'Overview',     emoji:'📊' },
    { key:'financials',   label:'Financials',   emoji:'📈' },
    { key:'technicals',   label:'Technicals',   emoji:'⚡' },
    { key:'shareholding', label:'Shareholding', emoji:'👥' },
    { key:'peers',        label:'Peers',        emoji:'⚖️' },
    { key:'analysts',     label:'Analysts',     emoji:'🎯' },
    { key:'rishi',        label:'Rishi Scores', emoji:'🧠' },
  ];

  return (
    <div style={{ fontFamily:'JetBrains Mono, monospace', background:'#050508', color:'#E2E8F0', minHeight:'100vh', padding:24, maxWidth:1400, margin:'0 auto' }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap"/>

      {/* BREADCRUMB */}
      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:20, fontSize:11, color:'#475569' }}>
        <Link href="/"        style={{ color:'#F59E0B', textDecoration:'none' }}>Dashboard</Link>
        <span>›</span>
        <Link href="/screener" style={{ color:'#F59E0B', textDecoration:'none' }}>Screener</Link>
        <span>›</span>
        <span style={{ color:'#F1F5F9' }}>{sym}</span>
      </div>

      {/* PRICE HEADER */}
      <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:14, padding:24, marginBottom:24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
              <div style={{ fontFamily:'Cinzel, Georgia', fontSize:22, color:'#F1F5F9', fontWeight:700 }}>{detail?.name || stock.name}</div>
              <span style={{ fontSize:10, color:'#475569', background:'#0F172A', borderRadius:4, padding:'2px 8px' }}>{sym}</span>
              <span style={{ fontSize:10, color:'#475569', background:'#0F172A', borderRadius:4, padding:'2px 8px' }}>{stock.exchange}</span>
            </div>
            <div style={{ fontSize:11, color:'#475569', marginBottom:16 }}>
              {detail?.sector || stock.sector} · {detail?.industry || stock.sector} · {detail?.isin || 'NSE'}
            </div>

            {/* PRICE */}
            <div style={{ display:'flex', alignItems:'baseline', gap:12, flexWrap:'wrap' }}>
              <div style={{ fontSize:42, fontWeight:700, color:'#F1F5F9', fontFamily:'JetBrains Mono, monospace' }}>
                {cmp.toLocaleString()}
              </div>
              <div style={{ textAlign:'left' }}>
                <div style={{ fontSize:18, color: isPos ? '#10B981' : '#EF4444', fontWeight:700 }}>
                  {isPos ? '▲' : '▼'} {isPos ? '+' : ''}{changeAmt} ({isPos ? '+' : ''}{changePct}%)
                </div>
                <div style={{ fontSize:9, color:'#334155' }}>Today's change</div>
              </div>
            </div>
          </div>

          {/* RISHI SIGNAL */}
          <div style={{ textAlign:'center', background:`${sc(composite)}15`, border:`2px solid ${sc(composite)}40`, borderRadius:12, padding:'20px 28px', minWidth:140 }}>
            <div style={{ fontSize:9, color:'#475569', letterSpacing:2, marginBottom:6 }}>RISHI SCORE</div>
            <div style={{ fontSize:52, fontWeight:700, color:sc(composite), fontFamily:'Cinzel, Georgia' }}>{composite}</div>
            <div style={{ fontSize:14, color:sc(composite), fontWeight:700, marginTop:4 }}>{signal}</div>
          </div>
        </div>

        {/* OHLC + VOLUME ROW */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(110px, 1fr))', gap:8, marginTop:20, paddingTop:20, borderTop:'1px solid #1E293B' }}>
          {[
            { label:'Open',     value:`${(detail?.open || cmp).toLocaleString()}` },
            { label:'High',     value:`${(detail?.high || cmp).toLocaleString()}`,     color:'#10B981' },
            { label:'Low',      value:`${(detail?.low  || cmp).toLocaleString()}`,     color:'#EF4444' },
            { label:'Prev Close',value:`${(detail?.prevClose || cmp).toLocaleString()}` },
            { label:'Volume',   value: detail ? (detail.volume / 1e6).toFixed(2) + 'M' : 'N/A' },
            { label:'Avg Vol',  value: detail ? (detail.avgVolume / 1e6).toFixed(2) + 'M' : 'N/A' },
            { label:'Mkt Cap',  value:`${(stock.mktcap / 1000).toFixed(0)}K Cr` },
          ].map(m => (
            <div key={m.label} style={{ background:'#050508', borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
              <div style={{ fontSize:8, color:'#334155', marginBottom:3 }}>{m.label}</div>
              <div style={{ fontSize:12, color: m.color || '#F1F5F9', fontWeight:600 }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* 52W RANGE BAR */}
        <div style={{ marginTop:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'#475569', marginBottom:6 }}>
            <span>52W Low: {low52w.toLocaleString()}</span>
            <span style={{ color:'#F59E0B' }}>Current: {cmp.toLocaleString()} ({rangePct.toFixed(0)}% of range)</span>
            <span>52W High: {high52w.toLocaleString()}</span>
          </div>
          <div style={{ height:8, background:'#1E293B', borderRadius:4, position:'relative' }}>
            <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${rangePct}%`, background:`linear-gradient(90deg, #EF4444, #F59E0B, #10B981)`, borderRadius:4 }}/>
            <div style={{ position:'absolute', top:-3, left:`${Math.min(97, Math.max(3, rangePct))}%`, transform:'translateX(-50%)', width:14, height:14, borderRadius:'50%', background:'#F1F5F9', border:'2px solid #F59E0B' }}/>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display:'flex', gap:8, marginBottom:24, flexWrap:'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding:'8px 16px', background: tab === t.key ? '#F59E0B15' : '#09090F', border: tab === t.key ? '1px solid #F59E0B' : '1px solid #1E293B', borderRadius:8, color: tab === t.key ? '#F59E0B' : '#475569', cursor:'pointer', fontSize:11, fontFamily:'JetBrains Mono, monospace', gap:6, display:'flex', alignItems:'center' }}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════ OVERVIEW TAB ═══════════ */}
      {tab === 'overview' && (
        <div>
          {/* KEY VALUATION METRICS */}
          <div style={{ fontSize:10, color:'#F59E0B', letterSpacing:2, fontWeight:600, marginBottom:12 }}>📊 VALUATION METRICS</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:10, marginBottom:24 }}>
            <MetricBox label="P/E Ratio"       value={`${detail?.pe  || stock.pe}x`}    sub="Lower = cheaper"         color={stock.pe < 20 ? '#10B981' : stock.pe < 35 ? '#F59E0B' : '#EF4444'} />
            <MetricBox label="P/B Ratio"       value={`${detail?.pb  || (stock.price / (stock.bvps || 100)).toFixed(1)}x`} sub="Price to Book"     />
            <MetricBox label="EPS (TTM)"       value={`${detail?.eps || stock.np / stock.sh}`}    sub="Earnings per share"  color="#10B981" />
            <MetricBox label="Market Cap"      value={`${(stock.mktcap/1000).toFixed(0)}K Cr`}    sub={stock.mktcap > 200000 ? 'Large Cap' : stock.mktcap > 50000 ? 'Mid Cap' : 'Small Cap'} color="#F59E0B" />
            <MetricBox label="ROE"             value={`${detail?.roe  || stock.roe}%`}  sub=">15% is good"            color={stock.roe > 20 ? '#10B981' : stock.roe > 15 ? '#F59E0B' : '#EF4444'} />
            <MetricBox label="ROCE"            value={`${detail?.roce || stock.roce}%`} sub=">15% is good"            color={stock.roce > 20 ? '#10B981' : stock.roce > 15 ? '#F59E0B' : '#EF4444'} />
            <MetricBox label="Debt/Equity"     value={`${detail?.debtEquity || stock.de}x`}  sub="<0.5 is safe"       color={stock.de < 0.5 ? '#10B981' : stock.de < 1 ? '#F59E0B' : '#EF4444'} />
            <MetricBox label="OPM"             value={`${detail?.opm || stock.opm}%`}   sub="Operating margin"        color={stock.opm > 20 ? '#10B981' : stock.opm > 10 ? '#F59E0B' : '#EF4444'} />
            <MetricBox label="Rev CAGR (3Y)"   value={`${stock.revcagr}%`}              sub="Revenue growth rate"     color={stock.revcagr > 15 ? '#10B981' : '#F59E0B'} />
            <MetricBox label="EPS CAGR (3Y)"   value={`${stock.epscagr}%`}              sub="Profit growth rate"      color={stock.epscagr > 15 ? '#10B981' : '#F59E0B'} />
            <MetricBox label="Div Yield"       value={`${detail?.dividendYield || (stock.price * 0.01).toFixed(2)}%`} sub="Annual dividend" />
            <MetricBox label="Promoter Hold."  value={`${stock.promo}%`}                sub="Skin in the game"        color={stock.promo > 50 ? '#10B981' : stock.promo > 30 ? '#F59E0B' : '#EF4444'} />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            {/* ABOUT */}
            {detail && (
              <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, padding:20 }}>
                <div style={{ fontSize:10, color:'#F59E0B', letterSpacing:2, fontWeight:600, marginBottom:12 }}>🏢 ABOUT</div>
                <div style={{ fontSize:12, color:'#94A3B8', lineHeight:1.8, marginBottom:16 }}>{detail.about}</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {[
                    { label:'Founded',    value: detail.founded     },
                    { label:'HQ',         value: detail.headquarters},
                    { label:'Employees',  value: detail.employees   },
                    { label:'Website',    value: detail.website     },
                    { label:'ISIN',       value: detail.isin        },
                    { label:'Industry',   value: detail.industry    },
                  ].map(m => (
                    <div key={m.label} style={{ background:'#050508', borderRadius:6, padding:'8px 10px' }}>
                      <div style={{ fontSize:8, color:'#334155', marginBottom:2 }}>{m.label}</div>
                      <div style={{ fontSize:10, color:'#94A3B8' }}>{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              {/* STRENGTHS */}
              {detail && (
                <div style={{ background:'#09090F', border:'1px solid #10B98130', borderRadius:12, padding:20, marginBottom:16 }}>
                  <div style={{ fontSize:10, color:'#10B981', letterSpacing:2, fontWeight:600, marginBottom:12 }}>✅ KEY STRENGTHS</div>
                  {detail.keyStrengths.map((s, i) => (
                    <div key={i} style={{ display:'flex', gap:10, padding:'6px 0', borderBottom:'1px solid #0F172A' }}>
                      <span style={{ color:'#10B981', fontSize:12 }}>▸</span>
                      <span style={{ fontSize:11, color:'#94A3B8', lineHeight:1.6 }}>{s}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* RISKS */}
              {detail && (
                <div style={{ background:'#09090F', border:'1px solid #EF444430', borderRadius:12, padding:20 }}>
                  <div style={{ fontSize:10, color:'#EF4444', letterSpacing:2, fontWeight:600, marginBottom:12 }}>⚠️ KEY RISKS</div>
                  {detail.keyRisks.map((r, i) => (
                    <div key={i} style={{ display:'flex', gap:10, padding:'6px 0', borderBottom:'1px solid #0F172A' }}>
                      <span style={{ color:'#EF4444', fontSize:12 }}>▸</span>
                      <span style={{ fontSize:11, color:'#94A3B8', lineHeight:1.6 }}>{r}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* FALLBACK if no detail */}
              {!detail && (
                <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, padding:20 }}>
                  <div style={{ fontSize:10, color:'#F59E0B', letterSpacing:2, fontWeight:600, marginBottom:12 }}>📋 BASIC INFO</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {[
                      { label:'Sector',   value: stock.sector   },
                      { label:'Exchange', value: stock.exchange  },
                      { label:'Price',    value: `${stock.price}` },
                      { label:'P/E',      value: `${stock.pe}x` },
                    ].map(m => (
                      <div key={m.label} style={{ background:'#050508', borderRadius:6, padding:'8px 10px' }}>
                        <div style={{ fontSize:8, color:'#334155', marginBottom:2 }}>{m.label}</div>
                        <div style={{ fontSize:11, color:'#94A3B8' }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RECENT NEWS */}
          {detail && detail.recentNews.length > 0 && (
            <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, padding:20, marginTop:20 }}>
              <div style={{ fontSize:10, color:'#818CF8', letterSpacing:2, fontWeight:600, marginBottom:14 }}>📰 RECENT NEWS</div>
              {detail.recentNews.map((n, i) => (
                <a key={i} href={n.url} target="_blank" rel="noopener noreferrer"
                  style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'12px 0', borderBottom:'1px solid #0F172A', textDecoration:'none', gap:12 }}>
                  <span style={{ fontSize:12, color:'#E2E8F0', lineHeight:1.5, fontFamily:'Georgia, serif', flex:1 }}>{n.headline}</span>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:9, color:'#334155' }}>{n.time}</div>
                    <div style={{ fontSize:9, color:'#F59E0B', marginTop:2 }}>{n.source} ↗</div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ FINANCIALS TAB ═══════════ */}
      {tab === 'financials' && (
        <div>
          {/* INCOME STATEMENT METRICS */}
          <div style={{ fontSize:10, color:'#F59E0B', letterSpacing:2, fontWeight:600, marginBottom:12 }}>💰 INCOME STATEMENT</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:10, marginBottom:24 }}>
            <MetricBox label="Revenue (TTM)"    value={`${(stock.rev/1000).toFixed(0)}K Cr`}   sub="Total income"          />
            <MetricBox label="Net Profit (TTM)" value={`${(stock.np/1000).toFixed(0)}K Cr`}    sub="PAT"     color="#10B981" />
            <MetricBox label="Operating CF"     value={`${(stock.ocf/1000).toFixed(0)}K Cr`}   sub="Cash from operations"  />
            <MetricBox label="Free Cash Flow"   value={`${(stock.fcf/1000).toFixed(0)}K Cr`}   sub="OCF - Capex" color={stock.fcf > 0 ? '#10B981' : '#EF4444'} />
            <MetricBox label="OPM"              value={`${stock.opm}%`}                          sub="Operating margin"      color={stock.opm > 20 ? '#10B981' : '#F59E0B'} />
            <MetricBox label="NPM"              value={detail ? `${detail.npm}%` : `${((stock.np/stock.rev)*100).toFixed(1)}%`} sub="Net profit margin" />
            <MetricBox label="Rev CAGR 3Y"      value={`${stock.revcagr}%`}                      sub="Sales growth"          color={stock.revcagr > 15 ? '#10B981' : '#F59E0B'} />
            <MetricBox label="EPS CAGR 3Y"      value={`${stock.epscagr}%`}                      sub="Profit growth"         color={stock.epscagr > 15 ? '#10B981' : '#F59E0B'} />
          </div>

          {/* BALANCE SHEET */}
          <div style={{ fontSize:10, color:'#818CF8', letterSpacing:2, fontWeight:600, marginBottom:12 }}>🏦 BALANCE SHEET</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:10, marginBottom:24 }}>
            <MetricBox label="Total Debt"       value={`${(stock.tl/1000).toFixed(0)}K Cr`}    sub="Total liabilities"     color="#EF4444" />
            <MetricBox label="Cash & Equiv."    value={`${(stock.ca/1000).toFixed(0)}K Cr`}    sub="Current assets"        color="#10B981" />
            <MetricBox label="Book Value/Share" value={`${stock.bvps || Math.round(stock.np/stock.sh * 5)}`}              sub="NAV per share"         />
            <MetricBox label="Debt/Equity"      value={`${stock.de}x`}                           sub="<0.5 is conservative"  color={stock.de < 0.5 ? '#10B981' : stock.de < 1 ? '#F59E0B' : '#EF4444'} />
            <MetricBox label="Net Debt"         value={detail ? `${(detail.netDebt/1000).toFixed(0)}K Cr` : `${((stock.tl-stock.ca)/1000).toFixed(0)}K Cr`} sub={detail && detail.netDebt < 0 ? '🟢 Net cash positive' : 'Net debt'} color={detail && detail.netDebt < 0 ? '#10B981' : '#EF4444'} />
            <MetricBox label="Curr. Ratio"      value={detail ? `${detail.currentRatio}x` : `${(stock.ca/stock.tl).toFixed(2)}x`} sub=">1.5 is healthy" color={(detail?.currentRatio || stock.ca/stock.tl) > 1.5 ? '#10B981' : '#F59E0B'} />
            <MetricBox label="Capex"            value={`${(stock.capex/100).toFixed(0)} Cr`}    sub="Capital expenditure"   />
            <MetricBox label="Depreciation"     value={`${(stock.dep/100).toFixed(0)} Cr`}      sub="Asset depreciation"    />
          </div>

          {/* QUARTERLY RESULTS TABLE */}
          {detail && detail.quarterlyResults.length > 0 && (
            <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, overflow:'hidden', marginBottom:24 }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid #1E293B', fontSize:10, color:'#F59E0B', letterSpacing:2, fontWeight:600 }}>📅 QUARTERLY RESULTS ( Cr)</div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead>
                    <tr style={{ background:'#06060D' }}>
                      {['Quarter','Revenue','Op. Profit','Net Profit','EPS','OPM %','Rev Gr%','PAT Gr%'].map(h => (
                        <th key={h} style={{ padding:'10px 14px', color:'#475569', fontSize:9, textAlign: h === 'Quarter' ? 'left' : 'right', letterSpacing:1 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.quarterlyResults.map((q, i) => (
                      <tr key={q.quarter} style={{ borderBottom:'1px solid #0F172A', background: i === 0 ? '#F59E0B08' : i % 2 === 0 ? '#09090F' : '#07070E' }}>
                        <td style={{ padding:'10px 14px', color: i === 0 ? '#F59E0B' : '#94A3B8', fontWeight: i === 0 ? 700 : 400 }}>{q.quarter}{i === 0 && <span style={{ fontSize:8, color:'#F59E0B', marginLeft:6 }}>LATEST</span>}</td>
                        <td style={{ padding:'10px 14px', color:'#F1F5F9', textAlign:'right', fontWeight:600 }}>{q.revenue.toLocaleString()}</td>
                        <td style={{ padding:'10px 14px', color:'#94A3B8', textAlign:'right' }}>{q.operatingProfit.toLocaleString()}</td>
                        <td style={{ padding:'10px 14px', textAlign:'right', fontWeight:700 }}>
                          <span style={{ color: q.netProfit > (detail.quarterlyResults[1]?.netProfit || 0) ? '#10B981' : '#EF4444' }}>
                            {q.netProfit.toLocaleString()}
                          </span>
                        </td>
                        <td style={{ padding:'10px 14px', color:'#94A3B8', textAlign:'right' }}>{q.eps}</td>
                        <td style={{ padding:'10px 14px', textAlign:'right', color: q.opm > 15 ? '#10B981' : '#F59E0B' }}>{q.opm}%</td>
                        <td style={{ padding:'10px 14px', textAlign:'right', color: q.revenueGrowth > 0 ? '#10B981' : '#EF4444' }}>
                          {q.revenueGrowth > 0 ? '+' : ''}{q.revenueGrowth}%
                        </td>
                        <td style={{ padding:'10px 14px', textAlign:'right', color: q.profitGrowth > 0 ? '#10B981' : '#EF4444' }}>
                          {q.profitGrowth > 0 ? '+' : ''}{q.profitGrowth}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MANAGEMENT */}
          {detail && (
            <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, padding:20 }}>
              <div style={{ fontSize:10, color:'#F59E0B', letterSpacing:2, fontWeight:600, marginBottom:14 }}>👔 MANAGEMENT</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:10 }}>
                {detail.management.map(m => (
                  <div key={m.name} style={{ background:'#050508', borderRadius:8, padding:'12px 14px', display:'flex', gap:12, alignItems:'center' }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', background:'#F59E0B20', border:'1px solid #F59E0B30', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>
                      👤
                    </div>
                    <div>
                      <div style={{ fontSize:12, color:'#F1F5F9', fontWeight:700 }}>{m.name}</div>
                      <div style={{ fontSize:9, color:'#475569', marginTop:2 }}>{m.designation}</div>
                      <div style={{ fontSize:8, color:'#334155', marginTop:2 }}>Since {m.since}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ TECHNICALS TAB ═══════════ */}
      {tab === 'technicals' && (
        <div>
          {/* TECHNICAL SUMMARY */}
          {detail && (
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 }}>
                {[
                  { label:'BUY Signals',     count: detail.technicals.filter(t => t.signal === 'BUY').length,     color:'#10B981' },
                  { label:'NEUTRAL Signals', count: detail.technicals.filter(t => t.signal === 'NEUTRAL').length, color:'#F59E0B' },
                  { label:'SELL Signals',    count: detail.technicals.filter(t => t.signal === 'SELL').length,    color:'#EF4444' },
                ].map(s => (
                  <div key={s.label} style={{ background:'#09090F', border:`1px solid ${s.color}30`, borderRadius:10, padding:20, textAlign:'center' }}>
                    <div style={{ fontSize:36, fontWeight:700, color:s.color }}>{s.count}</div>
                    <div style={{ fontSize:10, color:'#475569', marginTop:4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, overflow:'hidden', marginBottom:24 }}>
                <div style={{ padding:'12px 16px', borderBottom:'1px solid #1E293B', fontSize:10, color:'#F59E0B', letterSpacing:2, fontWeight:600 }}>⚡ TECHNICAL INDICATORS</div>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'#06060D' }}>
                      {['Indicator','Value','Signal','Timeframe'].map(h => (
                        <th key={h} style={{ padding:'10px 14px', color:'#475569', fontSize:9, textAlign: h === 'Indicator' ? 'left' : 'right', letterSpacing:1 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.technicals.map((t, i) => (
                      <tr key={t.name} style={{ borderBottom:'1px solid #0F172A', background: i % 2 === 0 ? '#09090F' : '#07070E' }}>
                        <td style={{ padding:'11px 14px', color:'#F1F5F9', fontWeight:600 }}>{t.name}</td>
                        <td style={{ padding:'11px 14px', color:'#94A3B8', textAlign:'right' }}>{t.value}</td>
                        <td style={{ padding:'11px 14px', textAlign:'right' }}>
                          <span style={{ background:`${sigColor(t.signal)}20`, border:`1px solid ${sigColor(t.signal)}40`, borderRadius:4, padding:'3px 10px', color:sigColor(t.signal), fontSize:9, fontWeight:700 }}>{t.signal}</span>
                        </td>
                        <td style={{ padding:'11px 14px', color:'#475569', textAlign:'right', fontSize:10 }}>{t.timeframe}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ALWAYS SHOW GENERIC TECHNICALS */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px,1fr))', gap:10 }}>
            <MetricBox label="Current Price"  value={`${cmp.toLocaleString()}`} />
            <MetricBox label="52W High"       value={`${high52w.toLocaleString()}`} color="#10B981" sub="Yearly peak" />
            <MetricBox label="52W Low"        value={`${low52w.toLocaleString()}`}  color="#EF4444" sub="Yearly trough" />
            <MetricBox label="From 52W High"  value={`${(((cmp - high52w) / high52w) * 100).toFixed(1)}%`} color="#EF4444" sub="Drawdown" />
            <MetricBox label="From 52W Low"   value={`+${(((cmp - low52w) / low52w) * 100).toFixed(1)}%`} color="#10B981" sub="Recovery" />
            <MetricBox label="Vol vs Avg"     value={detail ? `${((detail.volume / detail.avgVolume) * 100).toFixed(0)}%` : 'N/A'} color={detail && detail.volume > detail.avgVolume ? '#10B981' : '#F59E0B'} sub="Volume ratio" />
          </div>

          {!detail && (
            <div style={{ marginTop:20, background:'#F59E0B10', border:'1px solid #F59E0B30', borderRadius:8, padding:16, fontSize:11, color:'#F59E0B' }}>
              ℹ️ Detailed technical analysis available for HDFCBANK, TITAN, and RELIANCE. More stocks being added in next update.
            </div>
          )}
        </div>
      )}

      {/* ═══════════ SHAREHOLDING TAB ═══════════ */}
      {tab === 'shareholding' && (
        <div>
          {/* CURRENT PATTERN */}
          <div style={{ fontSize:10, color:'#F59E0B', letterSpacing:2, fontWeight:600, marginBottom:12 }}>👥 CURRENT SHAREHOLDING PATTERN</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px,1fr))', gap:10, marginBottom:24 }}>
            {[
              { label:'Promoter',  value: `${detail?.promoterHolding  || stock.promo}%`, color:'#F59E0B', sub:'Founders/promoters' },
              { label:'FII / FPI', value: `${detail?.fiiHolding || 22}%`,  color:'#818CF8', sub:'Foreign investors' },
              { label:'DII',       value: `${detail?.diiHolding || 18}%`,  color:'#10B981', sub:'Domestic institutions' },
              { label:'Public',    value: `${detail?.publicHolding || 12}%`,color:'#64748B', sub:'Retail & others' },
              { label:'Prom. Pledge', value:`${detail?.promoterPledge || stock.promo * 0.02}%`, color: (detail?.promoterPledge || 0) > 10 ? '#EF4444' : '#10B981', sub: (detail?.promoterPledge || 0) > 10 ? '⚠️ High pledge' : '✅ Low pledge' },
            ].map(s => <MetricBox key={s.label} label={s.label} value={s.value} color={s.color} sub={s.sub} />)}
          </div>

          {/* VISUAL PIE */}
          <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, padding:20, marginBottom:24 }}>
            <div style={{ fontSize:10, color:'#F59E0B', letterSpacing:2, fontWeight:600, marginBottom:14 }}>OWNERSHIP BREAKDOWN</div>
            {[
              { label:'Promoter',  pct: detail?.promoterHolding || stock.promo, color:'#F59E0B' },
              { label:'FII/FPI',   pct: detail?.fiiHolding  || 22,              color:'#818CF8' },
              { label:'DII',       pct: detail?.diiHolding  || 18,              color:'#10B981' },
              { label:'Public',    pct: detail?.publicHolding|| 12,             color:'#64748B' },
            ].map(s => (
              <div key={s.label} style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:11, color:s.color, fontWeight:600 }}>{s.label}</span>
                  <span style={{ fontSize:11, color:'#F1F5F9', fontWeight:700 }}>{s.pct.toFixed(1)}%</span>
                </div>
                <div style={{ height:10, background:'#1E293B', borderRadius:5 }}>
                  <div style={{ width:`${s.pct}%`, height:'100%', background:s.color, borderRadius:5 }}/>
                </div>
              </div>
            ))}
          </div>

          {/* HISTORY TABLE */}
          {detail && detail.shareholdingHistory.length > 0 && (
            <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid #1E293B', fontSize:10, color:'#F59E0B', letterSpacing:2, fontWeight:600 }}>📅 SHAREHOLDING TREND (LAST 5 QUARTERS)</div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead>
                    <tr style={{ background:'#06060D' }}>
                      {['Quarter','Promoter','FII/FPI','DII','Public','Prom. Pledge'].map(h => (
                        <th key={h} style={{ padding:'10px 14px', color:'#475569', fontSize:9, textAlign: h === 'Quarter' ? 'left' : 'right', letterSpacing:1 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.shareholdingHistory.map((q, i) => (
                      <tr key={q.quarter} style={{ borderBottom:'1px solid #0F172A', background: i === 0 ? '#F59E0B08' : i % 2 === 0 ? '#09090F' : '#07070E' }}>
                        <td style={{ padding:'10px 14px', color: i === 0 ? '#F59E0B' : '#94A3B8', fontWeight: i === 0 ? 700 : 400 }}>
                          {q.quarter}{i === 0 && <span style={{ fontSize:8, color:'#F59E0B', marginLeft:6 }}>LATEST</span>}
                        </td>
                        <td style={{ padding:'10px 14px', color:'#F59E0B', textAlign:'right', fontWeight:600 }}>{q.promoter}%</td>
                        <td style={{ padding:'10px 14px', color:'#818CF8', textAlign:'right' }}>
                          {q.fii}%
                          {i > 0 && (
                            <span style={{ fontSize:8, marginLeft:4, color: q.fii > detail.shareholdingHistory[i-1]?.fii ? '#10B981' : '#EF4444' }}>
                              {q.fii > (detail.shareholdingHistory[i-1]?.fii || 0) ? '▲' : '▼'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding:'10px 14px', color:'#10B981', textAlign:'right' }}>{q.dii}%</td>
                        <td style={{ padding:'10px 14px', color:'#64748B', textAlign:'right' }}>{q.public}%</td>
                        <td style={{ padding:'10px 14px', textAlign:'right' }}>
                          <span style={{ color: q.promoterPledged > 10 ? '#EF4444' : '#10B981', fontWeight:600 }}>{q.promoterPledged}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!detail && (
            <div style={{ background:'#F59E0B10', border:'1px solid #F59E0B30', borderRadius:8, padding:16, fontSize:11, color:'#F59E0B' }}>
              ℹ️ Historical shareholding trend available for HDFCBANK, TITAN, RELIANCE. More stocks being added.
            </div>
          )}
        </div>
      )}

      {/* ═══════════ PEERS TAB ═══════════ */}
      {tab === 'peers' && (
        <div>
          {detail && detail.peers.length > 0 ? (
            <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid #1E293B', fontSize:10, color:'#F59E0B', letterSpacing:2, fontWeight:600 }}>⚖️ PEER COMPARISON — {stock.sector.toUpperCase()} SECTOR</div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead>
                    <tr style={{ background:'#06060D' }}>
                      {['Company','Price','Mkt Cap','P/E','P/B','ROE','ROCE','D/E','Rev Growth','NPM'].map(h => (
                        <th key={h} style={{ padding:'10px 14px', color:'#475569', fontSize:9, textAlign: h === 'Company' ? 'left' : 'right', letterSpacing:1 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Current stock row */}
                    <tr style={{ background:'#F59E0B08', borderBottom:'2px solid #F59E0B30' }}>
                      <td style={{ padding:'12px 14px' }}>
                        <div style={{ color:'#F59E0B', fontWeight:700 }}>{sym} ★</div>
                        <div style={{ fontSize:9, color:'#475569' }}>{stock.name}</div>
                      </td>
                      <td style={{ padding:'12px 14px', color:'#F1F5F9', textAlign:'right', fontWeight:700 }}>{cmp.toLocaleString()}</td>
                      <td style={{ padding:'12px 14px', color:'#94A3B8', textAlign:'right' }}>{(stock.mktcap/1000).toFixed(0)}K Cr</td>
                      <td style={{ padding:'12px 14px', textAlign:'right' }}><span style={{ color: stock.pe < 25 ? '#10B981' : '#F59E0B', fontWeight:700 }}>{stock.pe}x</span></td>
                      <td style={{ padding:'12px 14px', color:'#94A3B8', textAlign:'right' }}>{detail?.pb.toFixed(1) || 'N/A'}x</td>
                      <td style={{ padding:'12px 14px', textAlign:'right' }}><span style={{ color: stock.roe > 15 ? '#10B981' : '#F59E0B' }}>{stock.roe}%</span></td>
                      <td style={{ padding:'12px 14px', textAlign:'right' }}><span style={{ color: stock.roce > 15 ? '#10B981' : '#F59E0B' }}>{stock.roce}%</span></td>
                      <td style={{ padding:'12px 14px', textAlign:'right' }}><span style={{ color: stock.de < 0.5 ? '#10B981' : '#EF4444' }}>{stock.de}x</span></td>
                      <td style={{ padding:'12px 14px', textAlign:'right', color:'#10B981' }}>+{stock.revcagr}%</td>
                      <td style={{ padding:'12px 14px', color:'#94A3B8', textAlign:'right' }}>{detail?.npm.toFixed(1) || 'N/A'}%</td>
                    </tr>
                    {detail.peers.map((p, i) => (
                      <tr key={p.symbol} style={{ borderBottom:'1px solid #0F172A', background: i % 2 === 0 ? '#09090F' : '#07070E' }}>
                        <td style={{ padding:'11px 14px' }}>
                          <Link href={`/stock/${p.symbol}`} style={{ color:'#818CF8', fontWeight:600, textDecoration:'none' }}>{p.symbol} ↗</Link>
                          <div style={{ fontSize:9, color:'#475569', marginTop:2 }}>{p.name}</div>
                        </td>
                        <td style={{ padding:'11px 14px', color:'#F1F5F9', textAlign:'right', fontWeight:600 }}>{p.price.toLocaleString()}</td>
                        <td style={{ padding:'11px 14px', color:'#94A3B8', textAlign:'right' }}>{(p.marketCap/1000).toFixed(0)}K Cr</td>
                        <td style={{ padding:'11px 14px', textAlign:'right' }}><span style={{ color: p.pe < 25 ? '#10B981' : '#F59E0B' }}>{p.pe}x</span></td>
                        <td style={{ padding:'11px 14px', color:'#94A3B8', textAlign:'right' }}>{p.pb.toFixed(1)}x</td>
                        <td style={{ padding:'11px 14px', textAlign:'right' }}><span style={{ color: p.roe > 15 ? '#10B981' : '#F59E0B' }}>{p.roe}%</span></td>
                        <td style={{ padding:'11px 14px', textAlign:'right' }}><span style={{ color: p.roce > 15 ? '#10B981' : '#F59E0B' }}>{p.roce}%</span></td>
                        <td style={{ padding:'11px 14px', textAlign:'right' }}><span style={{ color: p.debtEquity < 0.5 ? '#10B981' : '#EF4444' }}>{p.debtEquity}x</span></td>
                        <td style={{ padding:'11px 14px', textAlign:'right', color: p.revenueGrowth > 0 ? '#10B981' : '#EF4444' }}>+{p.revenueGrowth}%</td>
                        <td style={{ padding:'11px 14px', color:'#94A3B8', textAlign:'right' }}>{p.netProfitMargin}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ background:'#F59E0B10', border:'1px solid #F59E0B30', borderRadius:8, padding:24, fontSize:11, color:'#F59E0B', textAlign:'center' }}>
              <div style={{ fontSize:24, marginBottom:8 }}>⚖️</div>
              Peer comparison available for HDFCBANK, TITAN, RELIANCE. More stocks being added.
              <div style={{ marginTop:16, display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                {['HDFCBANK','TITAN','RELIANCE'].map(s => (
                  <Link key={s} href={`/stock/${s}`} style={{ color:'#F59E0B', border:'1px solid #F59E0B40', borderRadius:6, padding:'6px 14px', textDecoration:'none', fontSize:11 }}>{s}</Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ ANALYSTS TAB ═══════════ */}
      {tab === 'analysts' && (
        <div>
          {detail && detail.analystRecs.length > 0 ? (
            <div>
              {/* CONSENSUS */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
                {[
                  { label:'BUY / Outperform', count: detail.analystRecs.filter(r => r.rating === 'BUY' || r.rating === 'OUTPERFORM').length,  color:'#10B981' },
                  { label:'HOLD / Neutral',   count: detail.analystRecs.filter(r => r.rating === 'HOLD' || r.rating === 'NEUTRAL').length,      color:'#F59E0B' },
                  { label:'SELL',             count: detail.analystRecs.filter(r => r.rating === 'SELL').length,                               color:'#EF4444' },
                  { label:'Avg Target',       count: Math.round(detail.analystRecs.reduce((s,r) => s+r.targetPrice, 0) / detail.analystRecs.length), color:'#818CF8', isPrice:true },
                ].map(s => (
                  <div key={s.label} style={{ background:'#09090F', border:`1px solid ${s.color}30`, borderRadius:10, padding:20, textAlign:'center' }}>
                    <div style={{ fontSize:32, fontWeight:700, color:s.color }}>{s.isPrice ? `${s.count.toLocaleString()}` : s.count}</div>
                    <div style={{ fontSize:9, color:'#475569', marginTop:6 }}>{s.label}</div>
                    {s.isPrice && <div style={{ fontSize:9, color: s.count > cmp ? '#10B981' : '#EF4444', marginTop:4 }}>
                      {s.count > cmp ? '▲' : '▼'} {(((s.count - cmp) / cmp) * 100).toFixed(1)}% upside
                    </div>}
                  </div>
                ))}
              </div>

              {/* ANALYST TABLE */}
              <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, overflow:'hidden' }}>
                <div style={{ padding:'12px 16px', borderBottom:'1px solid #1E293B', fontSize:10, color:'#F59E0B', letterSpacing:2, fontWeight:600 }}>🎯 ANALYST RECOMMENDATIONS</div>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead>
                    <tr style={{ background:'#06060D' }}>
                      {['Brokerage','Analyst','Rating','Target Price','Upside','Date'].map(h => (
                        <th key={h} style={{ padding:'10px 14px', color:'#475569', fontSize:9, textAlign: h === 'Brokerage' || h === 'Analyst' ? 'left' : 'right', letterSpacing:1 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.analystRecs.map((r, i) => (
                      <tr key={i} style={{ borderBottom:'1px solid #0F172A', background: i % 2 === 0 ? '#09090F' : '#07070E' }}>
                        <td style={{ padding:'11px 14px', color:'#F1F5F9', fontWeight:600 }}>{r.firm}</td>
                        <td style={{ padding:'11px 14px', color:'#64748B' }}>{r.analyst}</td>
                        <td style={{ padding:'11px 14px', textAlign:'right' }}>
                          <span style={{ background:`${ratingColor(r.rating)}20`, border:`1px solid ${ratingColor(r.rating)}40`, borderRadius:4, padding:'3px 10px', color:ratingColor(r.rating), fontSize:9, fontWeight:700 }}>{r.rating}</span>
                        </td>
                        <td style={{ padding:'11px 14px', color:'#F1F5F9', textAlign:'right', fontWeight:700 }}>{r.targetPrice.toLocaleString()}</td>
                        <td style={{ padding:'11px 14px', textAlign:'right' }}>
                          <span style={{ color: r.upside > 0 ? '#10B981' : '#EF4444', fontWeight:700 }}>{r.upside > 0 ? '+' : ''}{r.upside}%</span>
                        </td>
                        <td style={{ padding:'11px 14px', color:'#475569', textAlign:'right', fontSize:10 }}>{r.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ background:'#F59E0B10', border:'1px solid #F59E0B30', borderRadius:8, padding:24, fontSize:11, color:'#F59E0B', textAlign:'center' }}>
              <div style={{ fontSize:24, marginBottom:8 }}>🎯</div>
              Analyst recommendations available for HDFCBANK, TITAN, RELIANCE. More stocks being added.
            </div>
          )}
        </div>
      )}

      {/* ═══════════ RISHI SCORES TAB ═══════════ */}
      {tab === 'rishi' && (
        <div>
          {/* COMPOSITE */}
          <div style={{ background:`${sc(composite)}15`, border:`2px solid ${sc(composite)}40`, borderRadius:14, padding:28, textAlign:'center', marginBottom:24 }}>
            <div style={{ fontSize:11, color:'#475569', letterSpacing:2, marginBottom:8 }}>COMPOSITE RISHI SCORE</div>
            <div style={{ fontSize:72, fontWeight:700, color:sc(composite), fontFamily:'Cinzel, Georgia' }}>{composite}</div>
            <div style={{ fontSize:20, color:sc(composite), fontWeight:700, marginTop:4 }}>{signal}</div>
            <div style={{ fontSize:11, color:'#475569', marginTop:8 }}>
              Average of {SCORERS.length} legendary investor frameworks
            </div>
          </div>

          {/* INDIVIDUAL SCORES */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:12, marginBottom:24 }}>
            {scores.map(s => (
              <div key={s.name} style={{ background:'#09090F', border:`1px solid ${sc(s.score)}20`, borderRadius:10, padding:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:13, color:'#F1F5F9', fontWeight:700 }}>{s.name}</div>
                    <div style={{ fontSize:9, color:'#475569', marginTop:2 }}>{s.origin} Investor</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:28, fontWeight:700, color:sc(s.score) }}>{s.score}</div>
                    <div style={{ fontSize:9, color:sc(s.score) }}>{getSig(s.score)}</div>
                  </div>
                </div>
                <div style={{ height:8, background:'#1E293B', borderRadius:4 }}>
                  <div style={{ width:`${s.score}%`, height:'100%', background:sc(s.score), borderRadius:4, transition:'width 0.5s ease' }}/>
                </div>
              </div>
            ))}
          </div>

          {/* WHAT THE RISHIS SAY */}
          <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, padding:20 }}>
            <div style={{ fontSize:10, color:'#F59E0B', letterSpacing:2, fontWeight:600, marginBottom:14 }}>🧠 WHAT THE RISHIS SAY</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:10 }}>
              {scores.map(s => {
                const verdict = s.score >= 72 ? `Strong BUY — meets ${s.name}'s core criteria`
                  : s.score >= 52 ? `HOLD — partially meets ${s.name}'s framework`
                  : `AVOID — does not meet ${s.name}'s requirements`;
                return (
                  <div key={s.name} style={{ background:'#050508', borderRadius:8, padding:12 }}>
                    <div style={{ fontSize:10, color:sc(s.score), fontWeight:700, marginBottom:4 }}>{s.name}</div>
                    <div style={{ fontSize:9, color:'#64748B', lineHeight:1.6 }}>{verdict}</div>
                  </div>
                );
              })}
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