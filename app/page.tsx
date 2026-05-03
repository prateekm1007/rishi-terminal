'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { STOCKS } from '../data/stocks';
import { scoreJhunjhunwala, scoreDamani, scoreBuffett, scoreGraham, scoreLynch, scoreKacholia, scoreKedia, scoreMunger, scoreGreenblatt, scorePabrai } from '../lib/scorers';
import { sc, getSig } from '../lib/utils';
import { CRYPTO_ASSETS, FEAR_GREED_INDEX, getCryptoMetrics, MARKET_DOMINANCE } from '../data/crypto';
import { INDIAN_INDEXES, FOREIGN_INDEXES, COMMODITIES, getMarketSummary } from '../data/markets';

const SCORERS = [scoreJhunjhunwala, scoreDamani, scoreBuffett, scoreGraham, scoreLynch, scoreKacholia, scoreKedia, scoreMunger, scoreGreenblatt, scorePabrai];
const SCORER_NAMES = ['Jhunjhunwala','Damani','Buffett','Graham','Lynch','Kacholia','Kedia','Munger','Greenblatt','Pabrai'];

function getComposite(sym: string) {
  const s = STOCKS[sym as keyof typeof STOCKS];
  if (!s) return 0;
  return Math.round(SCORERS.map(fn => fn(s)).reduce((a, b) => a + b.score, 0) / SCORERS.length);
}

function fmt(n: number) {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6)  return (n / 1e6).toFixed(1) + 'M';
  return n.toLocaleString();
}

function rsiColor(rsi: number) {
  if (rsi >= 70) return '#EF4444';
  if (rsi >= 55) return '#F59E0B';
  return '#10B981';
}

function macdColor(m: string) {
  if (m === 'BULLISH') return '#10B981';
  if (m === 'BEARISH') return '#EF4444';
  return '#818CF8';
}

function SectionHeader({ emoji, title, subtitle, color }: { emoji: string; title: string; subtitle: string; color: string }) {
  return (
    <div style={{ borderTop:'2px solid #1E293B', marginBottom:20, paddingTop:20 }}>
      <div style={{ fontFamily:'Cinzel, Georgia', fontSize:17, color, letterSpacing:3, fontWeight:700, marginBottom:3 }}>{emoji} {title}</div>
      <div style={{ fontSize:9, color:'#334155', letterSpacing:2 }}>{subtitle}</div>
    </div>
  );
}

interface TabBarProps {
  tabs: string[];
  labels: string[];
  active: string;
  onChange: (t: string) => void;
  color?: string;
}

function TabBar({ tabs, labels, active, onChange, color = '#F59E0B' }: TabBarProps) {
  return (
    <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
      {tabs.map((tab, i) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          style={{
            padding:'7px 14px',
            background: active === tab ? `${color}15` : '#09090F',
            border: active === tab ? `1px solid ${color}` : '1px solid #1E293B',
            borderRadius:6,
            color: active === tab ? color : '#475569',
            cursor:'pointer',
            fontSize:10,
            letterSpacing:1,
            fontFamily:'JetBrains Mono, monospace',
            textTransform:'uppercase' as const,
          }}
        >
          {labels[i]}
        </button>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [time, setTime]                   = useState('');
  const [search, setSearch]               = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [cryptoTab, setCryptoTab]         = useState('overview');
  const [commTab, setCommTab]             = useState('all');
  const searchRef = useRef<HTMLDivElement>(null);

  const allSymbols    = Object.keys(STOCKS);
  const stockOfDay    = 'TITAN';
  const stockData     = STOCKS[stockOfDay as keyof typeof STOCKS];
  const sotdScores    = SCORERS.map((fn, i) => ({ name: SCORER_NAMES[i], score: fn(stockData).score }));
  const sotdComposite = Math.round(sotdScores.reduce((a, b) => a + b.score, 0) / sotdScores.length);

  const topBuys = allSymbols
    .map(sym => ({ sym, score: getComposite(sym) }))
    .filter(x => x.score >= 65)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const cryptoMetrics   = getCryptoMetrics();
  const mktSummary      = getMarketSummary();
  const cryptoMoodColor = cryptoMetrics.sentiment === 'BULLISH' ? '#10B981' : cryptoMetrics.sentiment === 'BEARISH' ? '#EF4444' : '#818CF8';

  const filteredComm =
    commTab === 'metals' ? COMMODITIES.filter(c => c.category === 'Precious Metals' || c.category === 'Base Metals') :
    commTab === 'energy' ? COMMODITIES.filter(c => c.category === 'Energy') :
    commTab === 'agri'   ? COMMODITIES.filter(c => c.category === 'Agriculture') :
    commTab === 'mcx'    ? COMMODITIES.filter(c => c.category === 'MCX India') :
    COMMODITIES;

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-IN', { timeZone:'Asia/Kolkata', hour12:true }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (search.length < 1) { setSearchResults([]); return; }
    const q = search.toUpperCase();
    setSearchResults(
      allSymbols
        .filter(s => s.includes(q) || STOCKS[s as keyof typeof STOCKS].name.toUpperCase().includes(q))
        .slice(0, 6)
    );
  }, [search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchResults([]);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div style={{ fontFamily:'JetBrains Mono, monospace', background:'#050508', color:'#E2E8F0', minHeight:'100vh', padding:24, maxWidth:1400, margin:'0 auto' }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap"/>

      {/* HEADER */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontFamily:'Cinzel, Georgia', fontSize:22, color:'#F59E0B', letterSpacing:4, fontWeight:700 }}>⚡ RISHI TERMINAL</div>
          <div style={{ fontSize:9, color:'#334155', letterSpacing:3, marginTop:4 }}>STOCKS · INDEXES · COMMODITIES · CRYPTO</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:14, color:'#F59E0B' }}>🕐 {time} IST</div>
          <div style={{ fontSize:9, color:'#334155', marginTop:4 }}>NSE · BSE · MCX · GLOBAL</div>
        </div>
      </div>

      {/* GLOBAL QUICK STATS BAR */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:8, marginBottom:24, background:'#09090F', border:'1px solid #1E293B', borderRadius:10, padding:14 }}>
        {[
          { label:'NIFTY 50',  value: mktSummary.nifty  ? mktSummary.nifty.value.toLocaleString()      : '-', pct: mktSummary.nifty?.changePct },
          { label:'S&P 500',   value: mktSummary.sp500  ? mktSummary.sp500.value.toLocaleString()      : '-', pct: mktSummary.sp500?.changePct },
          { label:'GOLD',      value: mktSummary.gold   ? '$' + mktSummary.gold.price.toLocaleString() : '-', pct: mktSummary.gold?.changePct },
          { label:'CRUDE WTI', value: mktSummary.crude  ? '$' + mktSummary.crude.price                 : '-', pct: mktSummary.crude?.changePct },
          { label:'BTC',       value: '$98,500', pct:  2.45 },
          { label:'USD/INR',   value: '84.28',  pct: -0.12 },
        ].map(item => (
          <div key={item.label} style={{ textAlign:'center' }}>
            <div style={{ fontSize:8, color:'#334155', letterSpacing:1, marginBottom:4 }}>{item.label}</div>
            <div style={{ fontSize:13, color:'#F1F5F9', fontWeight:700 }}>{item.value}</div>
            {item.pct !== undefined && (
              <div style={{ fontSize:9, color: item.pct >= 0 ? '#10B981' : '#EF4444', marginTop:2 }}>
                {item.pct >= 0 ? '▲' : '▼'} {Math.abs(item.pct).toFixed(2)}%
              </div>
            )}
          </div>
        ))}
      </div>

      {/* SEARCH */}
      <div ref={searchRef} style={{ position:'relative', marginBottom:24 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Search stocks — TITAN, INFY, Reliance..."
          style={{ width:'100%', background:'#09090F', border:'1px solid #1E293B', borderRadius:8, padding:'11px 16px', color:'#E2E8F0', fontSize:13, fontFamily:'JetBrains Mono, monospace', boxSizing:'border-box', outline:'none' }}
        />
        {searchResults.length > 0 && (
          <div style={{ position:'absolute', top:'110%', left:0, right:0, background:'#09090F', border:'1px solid #1E293B', borderRadius:8, zIndex:100, overflow:'hidden' }}>
            {searchResults.map(sym => {
              const s    = STOCKS[sym as keyof typeof STOCKS];
              const comp = getComposite(sym);
              return (
                <Link key={sym} href={`/stock/${sym}`}
                  style={{ display:'flex', justifyContent:'space-between', padding:'10px 16px', textDecoration:'none', borderBottom:'1px solid #0F172A' }}
                  onClick={() => { setSearch(''); setSearchResults([]); }}>
                  <span style={{ color:'#F59E0B', fontWeight:600 }}>{sym}</span>
                  <span style={{ color:'#64748B', fontSize:11 }}>{s.name}</span>
                  <span style={{ color:sc(comp), fontWeight:700 }}>{comp}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* QUICK NAV */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(110px, 1fr))', gap:8, marginBottom:28 }}>
        {[
          { href:'/screener',  icon:'🔍', label:'Screener'  },
          { href:'/compare',   icon:'⚖️', label:'Compare'   },
          { href:'/portfolio', icon:'💼', label:'Portfolio' },
          { href:'/watchlist', icon:'⭐', label:'Watchlist' },
          { href:'/rishis',    icon:'🧠', label:'Rishis'    },
          { href:'/pulse',     icon:'📊', label:'Pulse'     },
          { href:'/news',      icon:'📰', label:'News'      },
        ].map(nav => (
          <Link key={nav.href} href={nav.href}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'12px 8px', background:'#09090F', border:'1px solid #1E293B', borderRadius:8, textDecoration:'none', color:'#94A3B8', fontSize:11, gap:6 }}>
            <span style={{ fontSize:18 }}>{nav.icon}</span>
            {nav.label}
          </Link>
        ))}
      </div>

      {/* STOCK OF THE DAY */}
      <div style={{ background:'#09090F', border:'1px solid #F59E0B30', borderRadius:12, padding:20, marginBottom:28 }}>
        <div style={{ fontSize:10, color:'#F59E0B', letterSpacing:2, marginBottom:14, fontWeight:600 }}>⭐ STOCK OF THE DAY — {stockOfDay}</div>
        <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:14 }}>
          <div>
            <div style={{ fontFamily:'Cinzel, Georgia', fontSize:17, color:'#F1F5F9', fontWeight:700 }}>{stockData.name}</div>
            <div style={{ fontSize:11, color:'#475569', marginTop:4 }}>{stockData.sector} · NSE · {stockData.price.toLocaleString()}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:30, fontWeight:700, color:sc(sotdComposite) }}>{sotdComposite}</div>
            <div style={{ fontSize:10, color:sc(sotdComposite), marginTop:2 }}>{getSig(sotdComposite)}</div>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(90px, 1fr))', gap:8 }}>
          {sotdScores.map(s => (
            <div key={s.name} style={{ background:'#050508', borderRadius:6, padding:'8px 10px' }}>
              <div style={{ fontSize:8, color:'#334155', marginBottom:3 }}>{s.name.toUpperCase()}</div>
              <div style={{ fontSize:14, color:sc(s.score), fontWeight:700 }}>{s.score}</div>
              <div style={{ height:3, background:'#1E293B', borderRadius:2, marginTop:5 }}>
                <div style={{ width:`${s.score}%`, height:'100%', background:sc(s.score), borderRadius:2 }}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TOP BUY SIGNALS */}
      <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, padding:20, marginBottom:28 }}>
        <div style={{ fontSize:10, color:'#10B981', letterSpacing:2, marginBottom:14, fontWeight:600 }}>🏆 TOP BUY SIGNALS</div>
        {topBuys.map((t, i) => {
          const s = STOCKS[t.sym as keyof typeof STOCKS];
          return (
            <Link key={t.sym} href={`/stock/${t.sym}`}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 0', borderBottom:'1px solid #0F172A', textDecoration:'none' }}>
              <span style={{ fontSize:11, color:'#334155', width:16 }}>#{i+1}</span>
              <span style={{ color:'#F59E0B', fontWeight:700, width:100 }}>{t.sym}</span>
              <span style={{ color:'#64748B', fontSize:11, flex:1 }}>{s.name}</span>
              <div style={{ width:80, height:6, background:'#1E293B', borderRadius:3 }}>
                <div style={{ width:`${t.score}%`, height:'100%', background:sc(t.score), borderRadius:3 }}/>
              </div>
              <span style={{ color:sc(t.score), fontWeight:700, width:32, textAlign:'right' }}>{t.score}</span>
            </Link>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════ */}
      {/* INDIAN INDEXES                                */}
      {/* ══════════════════════════════════════════════ */}
      <SectionHeader emoji="🇮🇳" title="INDIAN INDEXES" subtitle="NSE · BSE · SECTORAL INDICES · INDIA VIX" color="#F59E0B" />

      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        {[
          { label:`▲ ${mktSummary.indianUp} Advancing`,  bg:'#10B98115', border:'#10B98130', color:'#10B981' },
          { label:`▼ ${mktSummary.indianDown} Declining`, bg:'#EF444415', border:'#EF444430', color:'#EF4444' },
          { label:'🕐 NSE: 09:15 – 15:30 IST',           bg:'#09090F',   border:'#1E293B',   color:'#F59E0B' },
        ].map(chip => (
          <div key={chip.label} style={{ background:chip.bg, border:`1px solid ${chip.border}`, borderRadius:6, padding:'6px 14px', fontSize:10, color:chip.color }}>
            {chip.label}
          </div>
        ))}
      </div>

      <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, overflow:'hidden', marginBottom:28 }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
            <thead>
              <tr style={{ background:'#06060D' }}>
                {['Index','Value','Change','% Change','52W High','52W Low','P/E','Status'].map(h => (
                  <th key={h} style={{ padding:'10px 14px', color:'#475569', fontSize:9, textAlign: h === 'Index' ? 'left' : 'right', letterSpacing:1 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {INDIAN_INDEXES.map((idx, i) => {
                const pos         = idx.changePct >= 0;
                const isVix       = idx.symbol === 'INDIAVIX';
                const statusColor = isVix
                  ? (idx.value < 15 ? '#10B981' : idx.value < 20 ? '#F59E0B' : '#EF4444')
                  : (pos ? '#10B981' : '#EF4444');
                const statusLabel = isVix
                  ? (idx.value < 15 ? 'CALM' : idx.value < 20 ? 'ALERT' : 'FEAR')
                  : (pos ? 'RISING' : 'FALLING');
                return (
                  <tr key={idx.symbol} style={{ borderBottom:'1px solid #0F172A', background: i % 2 === 0 ? '#09090F' : '#07070E' }}>
                    <td style={{ padding:'11px 14px' }}>
                      <div style={{ color:'#F1F5F9', fontWeight:600 }}>{idx.flag} {idx.name}</div>
                      <div style={{ fontSize:9, color:'#334155', marginTop:2 }}>{idx.symbol}</div>
                    </td>
                    <td style={{ padding:'11px 14px', color:'#F1F5F9', textAlign:'right', fontWeight:700, fontSize:13 }}>{idx.value.toLocaleString()}</td>
                    <td style={{ padding:'11px 14px', color: pos ? '#10B981' : '#EF4444', textAlign:'right', fontWeight:600 }}>{pos ? '+' : ''}{idx.change.toFixed(1)}</td>
                    <td style={{ padding:'11px 14px', textAlign:'right' }}>
                      <span style={{ color: pos ? '#10B981' : '#EF4444', fontWeight:700 }}>{pos ? '▲' : '▼'} {Math.abs(idx.changePct).toFixed(2)}%</span>
                    </td>
                    <td style={{ padding:'11px 14px', color:'#64748B', textAlign:'right' }}>{idx.high52w.toLocaleString()}</td>
                    <td style={{ padding:'11px 14px', color:'#64748B', textAlign:'right' }}>{idx.low52w.toLocaleString()}</td>
                    <td style={{ padding:'11px 14px', color:'#94A3B8', textAlign:'right' }}>{idx.pe ? idx.pe + 'x' : '—'}</td>
                    <td style={{ padding:'11px 14px', textAlign:'right' }}>
                      <span style={{ background:`${statusColor}15`, border:`1px solid ${statusColor}40`, borderRadius:4, padding:'3px 8px', color:statusColor, fontSize:9, fontWeight:700 }}>{statusLabel}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════ */}
      {/* FOREIGN INDEXES                               */}
      {/* ══════════════════════════════════════════════ */}
      <SectionHeader emoji="🌍" title="GLOBAL INDEXES" subtitle="USA · EUROPE · ASIA · EMERGING MARKETS" color="#818CF8" />

      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        {[
          { label:`▲ ${mktSummary.foreignUp} Advancing`,  bg:'#10B98115', border:'#10B98130', color:'#10B981' },
          { label:`▼ ${mktSummary.foreignDown} Declining`, bg:'#EF444415', border:'#EF444430', color:'#EF4444' },
          { label:'🌐 14 Global Exchanges',                bg:'#09090F',   border:'#1E293B',   color:'#818CF8' },
        ].map(chip => (
          <div key={chip.label} style={{ background:chip.bg, border:`1px solid ${chip.border}`, borderRadius:6, padding:'6px 14px', fontSize:10, color:chip.color }}>
            {chip.label}
          </div>
        ))}
      </div>

      <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, overflow:'hidden', marginBottom:28 }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
            <thead>
              <tr style={{ background:'#06060D' }}>
                {['Index','Country','Value','Change','% Change','52W High','52W Low','P/E','Status'].map(h => (
                  <th key={h} style={{ padding:'10px 14px', color:'#475569', fontSize:9, textAlign: h === 'Index' || h === 'Country' ? 'left' : 'right', letterSpacing:1 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FOREIGN_INDEXES.map((idx, i) => {
                const pos         = idx.changePct >= 0;
                const isVix       = idx.symbol === 'VIX';
                const statusColor = isVix
                  ? (idx.value < 15 ? '#10B981' : idx.value < 25 ? '#F59E0B' : '#EF4444')
                  : (pos ? '#10B981' : '#EF4444');
                const statusLabel = isVix
                  ? (idx.value < 15 ? 'CALM' : idx.value < 25 ? 'ALERT' : 'FEAR')
                  : (pos ? 'RISING' : 'FALLING');
                return (
                  <tr key={idx.symbol} style={{ borderBottom:'1px solid #0F172A', background: i % 2 === 0 ? '#09090F' : '#07070E' }}>
                    <td style={{ padding:'11px 14px' }}>
                      <div style={{ color:'#F1F5F9', fontWeight:600 }}>{idx.flag} {idx.name}</div>
                      <div style={{ fontSize:9, color:'#334155', marginTop:2 }}>{idx.symbol}</div>
                    </td>
                    <td style={{ padding:'11px 14px', color:'#64748B', fontSize:10 }}>{idx.country}</td>
                    <td style={{ padding:'11px 14px', color:'#F1F5F9', textAlign:'right', fontWeight:700, fontSize:13 }}>{idx.value.toLocaleString()}</td>
                    <td style={{ padding:'11px 14px', color: pos ? '#10B981' : '#EF4444', textAlign:'right', fontWeight:600 }}>{pos ? '+' : ''}{idx.change.toFixed(1)}</td>
                    <td style={{ padding:'11px 14px', textAlign:'right' }}>
                      <span style={{ color: pos ? '#10B981' : '#EF4444', fontWeight:700 }}>{pos ? '▲' : '▼'} {Math.abs(idx.changePct).toFixed(2)}%</span>
                    </td>
                    <td style={{ padding:'11px 14px', color:'#64748B', textAlign:'right' }}>{idx.high52w.toLocaleString()}</td>
                    <td style={{ padding:'11px 14px', color:'#64748B', textAlign:'right' }}>{idx.low52w.toLocaleString()}</td>
                    <td style={{ padding:'11px 14px', color:'#94A3B8', textAlign:'right' }}>{idx.pe ? idx.pe + 'x' : '—'}</td>
                    <td style={{ padding:'11px 14px', textAlign:'right' }}>
                      <span style={{ background:`${statusColor}15`, border:`1px solid ${statusColor}40`, borderRadius:4, padding:'3px 8px', color:statusColor, fontSize:9, fontWeight:700 }}>{statusLabel}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════ */}
      {/* COMMODITIES                                   */}
      {/* ══════════════════════════════════════════════ */}
      <SectionHeader emoji="⚒️" title="COMMODITIES" subtitle="GOLD · CRUDE · BASE METALS · AGRI · MCX INDIA" color="#F97316" />

      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        {[
          { label:`▲ ${mktSummary.commUp} Rising`,    bg:'#10B98115', border:'#10B98130', color:'#10B981' },
          { label:`▼ ${mktSummary.commDown} Falling`, bg:'#EF444415', border:'#EF444430', color:'#EF4444' },
        ].map(chip => (
          <div key={chip.label} style={{ background:chip.bg, border:`1px solid ${chip.border}`, borderRadius:6, padding:'6px 14px', fontSize:10, color:chip.color }}>
            {chip.label}
          </div>
        ))}
      </div>

      <TabBar
        tabs={['all','metals','energy','agri','mcx']}
        labels={['All','🥇 Metals','⛽ Energy','🌾 Agriculture','🇮🇳 MCX India']}
        active={commTab}
        onChange={setCommTab}
        color="#F97316"
      />

      <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, overflow:'hidden', marginBottom:28 }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
            <thead>
              <tr style={{ background:'#06060D' }}>
                {['Commodity','Category','Price','Unit','Change','% Change','52W High','52W Low','52W Range'].map(h => (
                  <th key={h} style={{ padding:'10px 14px', color:'#475569', fontSize:9, textAlign: h === 'Commodity' || h === 'Category' || h === 'Unit' ? 'left' : 'right', letterSpacing:1 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredComm.map((c, i) => {
                const pos   = c.changePct >= 0;
                const range = c.high52w - c.low52w;
                const pos52 = range > 0 ? ((c.price - c.low52w) / range) * 100 : 50;
                return (
                  <tr key={c.symbol} style={{ borderBottom:'1px solid #0F172A', background: i % 2 === 0 ? '#09090F' : '#07070E' }}>
                    <td style={{ padding:'11px 14px' }}>
                      <div style={{ color:'#F1F5F9', fontWeight:600 }}>{c.emoji} {c.name}</div>
                      <div style={{ fontSize:9, color:'#334155', marginTop:2 }}>{c.symbol}</div>
                    </td>
                    <td style={{ padding:'11px 14px' }}>
                      <span style={{ fontSize:9, color:'#64748B', background:'#050508', borderRadius:4, padding:'2px 6px' }}>{c.category}</span>
                    </td>
                    <td style={{ padding:'11px 14px', color:'#F1F5F9', textAlign:'right', fontWeight:700, fontSize:13 }}>{c.price.toLocaleString()}</td>
                    <td style={{ padding:'11px 14px', color:'#475569', fontSize:9 }}>{c.unit}</td>
                    <td style={{ padding:'11px 14px', color: pos ? '#10B981' : '#EF4444', textAlign:'right', fontWeight:600 }}>{pos ? '+' : ''}{c.change.toFixed(2)}</td>
                    <td style={{ padding:'11px 14px', textAlign:'right' }}>
                      <span style={{ color: pos ? '#10B981' : '#EF4444', fontWeight:700 }}>{pos ? '▲' : '▼'} {Math.abs(c.changePct).toFixed(2)}%</span>
                    </td>
                    <td style={{ padding:'11px 14px', color:'#64748B', textAlign:'right' }}>{c.high52w.toLocaleString()}</td>
                    <td style={{ padding:'11px 14px', color:'#64748B', textAlign:'right' }}>{c.low52w.toLocaleString()}</td>
                    <td style={{ padding:'11px 14px', textAlign:'right', minWidth:110 }}>
                      <div style={{ fontSize:8, color:'#334155', marginBottom:4, display:'flex', justifyContent:'space-between' }}>
                        <span>L</span><span>{pos52.toFixed(0)}%</span><span>H</span>
                      </div>
                      <div style={{ height:5, background:'#1E293B', borderRadius:3, position:'relative' }}>
                        <div style={{ position:'absolute', left:`${Math.min(95, Math.max(5, pos52))}%`, top:-2, width:9, height:9, borderRadius:'50%', background: pos ? '#10B981' : '#EF4444', transform:'translateX(-50%)' }}/>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════ */}
      {/* CRYPTO                                        */}
      {/* ══════════════════════════════════════════════ */}
      <SectionHeader emoji="🪙" title="CRYPTO MARKETS" subtitle="DIGITAL ASSET INTELLIGENCE · FEAR & GREED · DOMINANCE" color="#818CF8" />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(155px, 1fr))', gap:10, marginBottom:20 }}>
        {[
          { label:'Sentiment',     value: cryptoMetrics.sentiment,   color: cryptoMoodColor },
          { label:'Total Mkt Cap', value: '$' + fmt(cryptoMetrics.totalMarketCap), color:'#F1F5F9' },
          { label:'24h Volume',    value: '$' + fmt(cryptoMetrics.totalVolume),    color:'#F1F5F9' },
          { label:'Avg 24h Chg',   value: (cryptoMetrics.avgChange24h >= 0 ? '+' : '') + cryptoMetrics.avgChange24h.toFixed(2) + '%', color: cryptoMetrics.avgChange24h >= 0 ? '#10B981' : '#EF4444' },
          { label:'Avg RSI',       value: cryptoMetrics.avgRSI.toString(), color: rsiColor(cryptoMetrics.avgRSI) },
          { label:'BTC Dominance', value: MARKET_DOMINANCE.btc + '%', color:'#F59E0B' },
          { label:'Gainers / Losers', value: `${cryptoMetrics.gainers}↑  ${cryptoMetrics.losers}↓`, color:'#94A3B8' },
        ].map(m => (
          <div key={m.label} style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
            <div style={{ fontSize:8, color:'#475569', letterSpacing:1, marginBottom:6, textTransform:'uppercase' }}>{m.label}</div>
            <div style={{ fontSize:16, fontWeight:700, color:m.color, fontFamily:'JetBrains Mono, monospace' }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Fear & Greed */}
      <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, padding:18, marginBottom:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:8 }}>
          <div style={{ fontSize:10, color:'#818CF8', letterSpacing:2, fontWeight:600 }}>😱 FEAR &amp; GREED INDEX</div>
          <div style={{ fontSize:20, fontWeight:700, color:'#F59E0B' }}>{FEAR_GREED_INDEX.value} — {FEAR_GREED_INDEX.label}</div>
        </div>
        <div style={{ position:'relative', height:24, background:'linear-gradient(90deg, #EF4444 0%, #F59E0B 50%, #10B981 100%)', borderRadius:6, marginBottom:6 }}>
          <div style={{ position:'absolute', top:-8, left:`${FEAR_GREED_INDEX.value}%`, transform:'translateX(-50%)', fontSize:16 }}>📍</div>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'#475569', marginBottom:14 }}>
          <span>😱 Extreme Fear</span><span>😐 Neutral</span><span>🤑 Extreme Greed</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {[
            { label:'Yesterday', v: FEAR_GREED_INDEX.previousDay   },
            { label:'Last Week', v: FEAR_GREED_INDEX.previousWeek  },
            { label:'Last Month',v: FEAR_GREED_INDEX.previousMonth },
          ].map(f => (
            <div key={f.label} style={{ background:'#050508', borderRadius:6, padding:'8px 10px', textAlign:'center' }}>
              <div style={{ fontSize:8, color:'#334155', marginBottom:3 }}>{f.label.toUpperCase()}</div>
              <div style={{ fontSize:15, fontWeight:700, color: f.v >= 60 ? '#10B981' : f.v >= 40 ? '#F59E0B' : '#EF4444' }}>{f.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* BTC Dominance */}
      <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, padding:18, marginBottom:20 }}>
        <div style={{ fontSize:10, color:'#818CF8', letterSpacing:2, fontWeight:600, marginBottom:14 }}>📊 MARKET DOMINANCE</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[
            { label:'Bitcoin',  pct: MARKET_DOMINANCE.btc,    color:'#F59E0B' },
            { label:'Ethereum', pct: MARKET_DOMINANCE.eth,    color:'#818CF8' },
            { label:'BNB',      pct: MARKET_DOMINANCE.bnb,    color:'#F97316' },
            { label:'Others',   pct: MARKET_DOMINANCE.others, color:'#475569' },
          ].map(d => (
            <div key={d.label}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ fontSize:10, color:d.color }}>{d.label}</span>
                <span style={{ fontSize:10, color:'#94A3B8', fontWeight:700 }}>{d.pct}%</span>
              </div>
              <div style={{ height:8, background:'#1E293B', borderRadius:4 }}>
                <div style={{ width:`${d.pct}%`, height:'100%', background:d.color, borderRadius:4 }}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Crypto tab switcher */}
      <TabBar
        tabs={['overview','table','sectors']}
        labels={['Overview','Table','Sectors']}
        active={cryptoTab}
        onChange={setCryptoTab}
        color="#818CF8"
      />

      {/* CRYPTO OVERVIEW */}
      {cryptoTab === 'overview' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(210px, 1fr))', gap:12, marginBottom:28 }}>
          {CRYPTO_ASSETS.map(c => {
            const pos24 = c.change24h >= 0;
            const pos7d  = c.change7d  >= 0;
            return (
              <div key={c.symbol} style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:10, padding:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <span style={{ fontSize:15 }}>{c.emoji}</span>
                      <span style={{ color:'#F59E0B', fontWeight:700, fontSize:13 }}>{c.symbol}</span>
                    </div>
                    <div style={{ fontSize:9, color:'#475569', marginTop:2 }}>{c.name}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:11, color:'#F1F5F9', fontWeight:600 }}>${c.price.toLocaleString('en-US', { maximumFractionDigits:4 })}</div>
                    <div style={{ fontSize:9, color: pos24 ? '#10B981' : '#EF4444', marginTop:2 }}>{pos24 ? '▲' : '▼'} {Math.abs(c.change24h).toFixed(2)}%</div>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5, marginBottom:8 }}>
                  {[
                    { label:'7D',   value:(pos7d ? '+' : '') + c.change7d.toFixed(2) + '%', color: pos7d ? '#10B981' : '#EF4444' },
                    { label:'MCAP', value:'$' + fmt(c.marketCap),   color:'#94A3B8' },
                    { label:'RSI',  value: c.rsi.toString(),         color: rsiColor(c.rsi) },
                    { label:'MACD', value: c.macd,                   color: macdColor(c.macd) },
                  ].map(m => (
                    <div key={m.label} style={{ background:'#050508', borderRadius:5, padding:'5px 7px' }}>
                      <div style={{ fontSize:7, color:'#334155' }}>{m.label}</div>
                      <div style={{ fontSize:10, color:m.color, fontWeight:600 }}>{m.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize:8, color:'#334155', marginBottom:4 }}>
                  200D MA:{' '}
                  <span style={{ color: c.price > c.moving200d ? '#10B981' : '#EF4444' }}>
                    {c.price > c.moving200d ? '▲ ABOVE' : '▼ BELOW'} ${c.moving200d.toLocaleString()}
                  </span>
                </div>
                <div style={{ fontSize:8, color:'#334155', marginBottom:3 }}>
                  From ATH: <span style={{ color:'#EF4444' }}>{c.fromAth.toFixed(1)}%</span>
                </div>
                <div style={{ height:4, background:'#1E293B', borderRadius:2 }}>
                  <div style={{ width:`${Math.max(0, 100 + c.fromAth)}%`, height:'100%', background: Math.abs(c.fromAth) < 20 ? '#10B981' : Math.abs(c.fromAth) < 50 ? '#F59E0B' : '#EF4444', borderRadius:2 }}/>
                </div>
                <div style={{ marginTop:6, fontSize:7, color:'#334155' }}>{c.sector} · Vol ${fmt(c.volume24h)}/24h</div>
              </div>
            );
          })}
        </div>
      )}

      {/* CRYPTO TABLE */}
      {cryptoTab === 'table' && (
        <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, overflow:'hidden', marginBottom:28 }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
              <thead>
                <tr style={{ background:'#06060D' }}>
                  {['#','Coin','Price','24h','7d','Mkt Cap','Volume','RSI','MACD','200D MA','From ATH'].map(h => (
                    <th key={h} style={{ padding:'10px 12px', color:'#475569', fontSize:9, textAlign: h === '#' || h === 'Coin' ? 'left' : 'right', letterSpacing:1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CRYPTO_ASSETS.map((c, i) => {
                  const pos24 = c.change24h >= 0;
                  const pos7d  = c.change7d  >= 0;
                  return (
                    <tr key={c.symbol} style={{ borderBottom:'1px solid #0F172A', background: i % 2 === 0 ? '#09090F' : '#07070E' }}>
                      <td style={{ padding:'10px 12px', color:'#334155', fontSize:10 }}>{i + 1}</td>
                      <td style={{ padding:'10px 12px' }}>
                        <span style={{ marginRight:6 }}>{c.emoji}</span>
                        <span style={{ color:'#F59E0B', fontWeight:700 }}>{c.symbol}</span>
                        <span style={{ color:'#334155', fontSize:9, marginLeft:6 }}>{c.name}</span>
                      </td>
                      <td style={{ padding:'10px 12px', color:'#F1F5F9', textAlign:'right', fontWeight:600 }}>${c.price.toLocaleString('en-US', { maximumFractionDigits:4 })}</td>
                      <td style={{ padding:'10px 12px', color: pos24 ? '#10B981' : '#EF4444', textAlign:'right', fontWeight:600 }}>{pos24 ? '+' : ''}{c.change24h.toFixed(2)}%</td>
                      <td style={{ padding:'10px 12px', color: pos7d  ? '#10B981' : '#EF4444', textAlign:'right', fontWeight:600 }}>{pos7d  ? '+' : ''}{c.change7d.toFixed(2)}%</td>
                      <td style={{ padding:'10px 12px', color:'#94A3B8', textAlign:'right' }}>${fmt(c.marketCap)}</td>
                      <td style={{ padding:'10px 12px', color:'#64748B', textAlign:'right' }}>${fmt(c.volume24h)}</td>
                      <td style={{ padding:'10px 12px', textAlign:'right', color:rsiColor(c.rsi), fontWeight:600 }}>{c.rsi}</td>
                      <td style={{ padding:'10px 12px', textAlign:'right', color:macdColor(c.macd), fontWeight:700, fontSize:9 }}>{c.macd}</td>
                      <td style={{ padding:'10px 12px', textAlign:'right', color: c.price > c.moving200d ? '#10B981' : '#EF4444', fontSize:9 }}>{c.price > c.moving200d ? '▲ ABOVE' : '▼ BELOW'}</td>
                      <td style={{ padding:'10px 12px', textAlign:'right', color:'#EF4444', fontSize:10 }}>{c.fromAth.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CRYPTO SECTORS */}
      {cryptoTab === 'sectors' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:14, marginBottom:28 }}>
          {[...new Set(CRYPTO_ASSETS.map(c => c.sector))].map(sector => {
            const coins     = CRYPTO_ASSETS.filter(c => c.sector === sector);
            const avgChange = coins.reduce((s, c) => s + c.change24h, 0) / coins.length;
            const totalMcap = coins.reduce((s, c) => s + c.marketCap, 0);
            return (
              <div key={sector} style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:10, padding:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                  <div style={{ fontSize:11, color:'#818CF8', fontWeight:700 }}>{sector}</div>
                  <div style={{ fontSize:10, color: avgChange >= 0 ? '#10B981' : '#EF4444', fontWeight:600 }}>{avgChange >= 0 ? '+' : ''}{avgChange.toFixed(2)}% avg</div>
                </div>
                <div style={{ fontSize:9, color:'#334155', marginBottom:8 }}>MCap: ${fmt(totalMcap)}</div>
                {coins.map(c => (
                  <div key={c.symbol} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #0F172A', alignItems:'center' }}>
                    <span style={{ color:'#F59E0B', fontSize:11 }}>{c.emoji} {c.symbol}</span>
                    <span style={{ color:'#475569', fontSize:10 }}>${c.price.toLocaleString('en-US', { maximumFractionDigits:4 })}</span>
                    <span style={{ color: c.change24h >= 0 ? '#10B981' : '#EF4444', fontSize:10, fontWeight:600 }}>{c.change24h >= 0 ? '+' : ''}{c.change24h.toFixed(2)}%</span>
                    <span style={{ fontSize:9, color:rsiColor(c.rsi) }}>RSI {c.rsi}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* FOOTER */}
      <div style={{ textAlign:'center', fontSize:9, color:'#0F172A', letterSpacing:1, marginTop:20, paddingTop:20, borderTop:'1px solid #0F172A' }}>
        NOT INVESTMENT ADVICE · EDUCATIONAL SIMULATION · RISHI TERMINAL v4.0
      </div>
    </div>
  );
}