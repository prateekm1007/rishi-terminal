'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { STOCKS } from '../data/stocks';
import { scoreJhunjhunwala, scoreDamani, scoreBuffett, scoreGraham, scoreLynch, scoreKacholia, scoreKedia, scoreMunger, scoreGreenblatt, scorePabrai } from '../lib/scorers';
import { sc, getSig } from '../lib/utils';
import { CRYPTO_ASSETS, FEAR_GREED_INDEX, getCryptoMetrics, MARKET_DOMINANCE } from '../data/crypto';
import { INDIAN_INDEXES, FOREIGN_INDEXES, COMMODITIES, getMarketSummary } from '../data/markets';
import { getWisdomOfTheDay } from '../lib/wisdom/wisdom-of-day';

const SCORERS = [scoreJhunjhunwala, scoreDamani, scoreBuffett, scoreGraham, scoreLynch, scoreKacholia, scoreKedia, scoreMunger, scoreGreenblatt, scorePabrai];
const SCORER_NAMES = ['Jhunjhunwala','Damani','Buffett','Graham','Lynch','Kacholia','Kedia','Munger','Greenblatt','Pabrai'];

function getComposite(sym: string) {
  const s = STOCKS[sym as keyof typeof STOCKS];
  if (!s) return 0;
  return Math.round(SCORERS.map(fn => fn(s)).reduce((a, b) => a + b.score, 0) / SCORERS.length);
}

function fmt(n: number) {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  return n.toLocaleString('en-US');
}

/**
 * Intelligently select stock of the day
 * Rotate through top quality stocks
 */
function getStockOfDay(): string {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  
  const candidates = Object.keys(STOCKS)
    .map(sym => ({ sym, score: getComposite(sym) }))
    .filter(x => x.score >= 65)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(x => x.sym);
  
  if (candidates.length === 0) return 'TITAN';
  return candidates[dayOfYear % candidates.length];
}

export default function Dashboard() {
  const [time, setTime] = useState('');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'indexes'|'commodities'|'crypto'>('indexes');
  const searchRef = useRef<HTMLDivElement>(null);

  const allSymbols = Object.keys(STOCKS);
  const stockOfDay = getStockOfDay();
  const stockData = STOCKS[stockOfDay as keyof typeof STOCKS] ?? STOCKS[allSymbols[0]];

  const sotdScores = stockData
    ? SCORERS.map((fn, i) => ({ name: SCORER_NAMES[i], score: fn(stockData).score }))
    : [];
  const sotdComposite = sotdScores.length
    ? Math.round(sotdScores.reduce((a, b) => a + b.score, 0) / sotdScores.length)
    : 0;

  const topBuys = allSymbols
    .map(sym => ({ sym, score: getComposite(sym) }))
    .filter(x => x.score >= 65)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const cryptoMetrics = getCryptoMetrics();
  const mktSummary = getMarketSummary();
  const wisdomOfDay = getWisdomOfTheDay();

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (search.length < 1) { setSearchResults([]); return; }
    const q = search.toUpperCase();
    setSearchResults(
      allSymbols.filter(s => s.includes(q) || (STOCKS[s as keyof typeof STOCKS]?.name ?? '').toUpperCase().includes(q)).slice(0, 6)
    );
  }, [search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchResults([]);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const scoreColor = (s: number) => s >= 75 ? 'var(--accent-green)' : s >= 55 ? 'var(--accent-gold)' : 'var(--accent-red)';

  if (!stockData) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>Loading stocks...</div>
    </div>
  );

  return (
    <main className="page-container">

      {/* Header */}
      <div className="page-header">
        <div className="content-wrapper" style={{ padding: '0 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 28, color: 'var(--accent-gold)', letterSpacing: 3, fontWeight: 700 }}>
                RISHI TERMINAL
              </h1>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2, marginTop: 4 }}>
                STOCKS Â· BONDS Â· FOREX Â· CRYPTO Â· COMMODITIES
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 16, color: 'var(--accent-gold)', fontWeight: 700 }}>{time} IST</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>NSE Â· BSE Â· MCX Â· GLOBAL</div>
            </div>
          </div>
        </div>
      </div>

      <div className="content-wrapper">

        {/* Global Quick Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 32 }}>
          {[
            { label: 'NIFTY 50',  value: mktSummary.nifty  ? mktSummary.nifty.value.toLocaleString('en-US') : '24,850', pct: mktSummary.nifty?.changePct  ?? 0.75 },
            { label: 'S&P 500',   value: mktSummary.sp500  ? mktSummary.sp500.value.toLocaleString('en-US') : '5,850',  pct: mktSummary.sp500?.changePct  ?? 0.78 },
            { label: 'GOLD',      value: mktSummary.gold   ? '$' + mktSummary.gold.price.toLocaleString('en-US') : '$2,650', pct: mktSummary.gold?.changePct ?? 0.47 },
            { label: 'CRUDE WTI', value: mktSummary.crude  ? '$' + mktSummary.crude.price : '$72.5', pct: mktSummary.crude?.changePct ?? 2.62 },
            { label: 'BTC',       value: '$98,500',         pct: 2.45  },
            { label: 'USD/INR',   value: '84.28',           pct: -0.12 },
          ].map(item => (
            <div key={item.label} className="card" style={{ padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 6 }}>{item.label}</div>
              <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 700 }}>{item.value}</div>
              <div style={{ fontSize: 11, color: item.pct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', marginTop: 4 }}>
                {item.pct >= 0 ? 'â–²' : 'â–¼'} {Math.abs(item.pct).toFixed(2)}%
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div ref={searchRef} style={{ position: 'relative', marginBottom: 32 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search stocks â€” TITAN, INFY, Reliance..."
            style={{
              width: '100%', padding: '14px 18px', borderRadius: 10, fontSize: 14,
              background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)', boxSizing: 'border-box',
            }}
          />
          {searchResults.length > 0 && (
            <div style={{
              position: 'absolute', top: '110%', left: 0, right: 0,
              background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
              borderRadius: 10, zIndex: 100, overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}>
              {searchResults.map(sym => {
                const s = STOCKS[sym as keyof typeof STOCKS];
                const comp = getComposite(sym);
                return (
                  <Link key={sym} href={`/stock/${sym}`}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid var(--border-subtle)', textDecoration: 'none' }}
                    onClick={() => { setSearch(''); setSearchResults([]); }}>
                    <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>{sym}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{s?.name}</span>
                    <span style={{ color: scoreColor(comp), fontWeight: 700 }}>{comp}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Nav */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10, marginBottom: 40 }}>
          {[
            { href: '/screener',    icon: 'ðŸ“Š', label: 'Screener'    },
            { href: '/compare',     icon: 'âš–ï¸',  label: 'Compare'     },
            { href: '/portfolio',   icon: 'ðŸŽ’',  label: 'Portfolio'   },
            { href: '/watchlist',   icon: 'â­',  label: 'Watchlist'   },
            { href: '/rishis',      icon: 'ðŸ§˜',  label: 'Rishis'      },
            { href: '/bonds',       icon: 'ðŸ›ï¸',  label: 'Bonds'       },
            { href: '/forex',       icon: 'ðŸ’±',  label: 'Forex'       },
            { href: '/news',        icon: 'ðŸ“°',  label: 'News'        },
            { href: '/commodities', icon: 'ðŸ›¢ï¸',  label: 'Commodities' },
            { href: '/crypto',      icon: 'â‚¿',   label: 'Crypto'      },
          ].map(nav => (
            <Link key={nav.href} href={nav.href}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '14px 8px', borderRadius: 10, textDecoration: 'none',
                color: 'var(--text-secondary)', fontSize: 11, gap: 6,
                background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-gold)';
                (e.currentTarget as HTMLElement).style.color = 'var(--accent-gold)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-primary)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
              }}
            >
              <span style={{ fontSize: 20 }}>{nav.icon}</span>
              {nav.label}
            </Link>
          ))}
        </div>

        {/* Two column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>

          {/* Stock of the Day */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: 10, color: 'var(--accent-gold)', letterSpacing: 2, marginBottom: 16, fontWeight: 700 }}>
              â­ STOCK OF THE DAY â€” {stockOfDay}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: 18, color: 'var(--text-primary)', fontWeight: 700 }}>{stockData.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{stockData.sector} Â· NSE Â· {stockData.price.toLocaleString('en-US')}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 36, fontWeight: 700, color: scoreColor(sotdComposite), lineHeight: 1 }}>{sotdComposite}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{getSig(sotdComposite)}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
              {sotdScores.map(s => (
                <div key={s.name} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 4 }}>{s.name.toUpperCase().slice(0, 8)}</div>
                  <div style={{ fontSize: 16, color: scoreColor(s.score), fontWeight: 700 }}>{s.score}</div>
                  <div style={{ height: 3, background: 'var(--border-primary)', borderRadius: 2, marginTop: 5 }}>
                    <div style={{ width: `${s.score}%`, height: '100%', background: scoreColor(s.score), borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
            <Link href={`/stock/${stockOfDay}`} style={{
              display: 'block', marginTop: 16, padding: '10px', textAlign: 'center',
              background: 'var(--accent-gold)', color: '#000', borderRadius: 8,
              fontWeight: 700, fontSize: 13, textDecoration: 'none',
            }}>
              Full Deep-Dive â†’
            </Link>
          </div>

          {/* Wisdom of the Day */}
          <div className="card" style={{ padding: 24, background: `linear-gradient(135deg, ${wisdomOfDay.color}08 0%, var(--bg-card) 100%)` }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 12, fontWeight: 700 }}>
              âœ¨ WISDOM OF THE DAY
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 28 }}>{wisdomOfDay.emoji}</div>
              <div>
                <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: 'var(--text-primary)', fontWeight: 700, margin: '0 0 4px 0' }}>
                  {wisdomOfDay.title}
                </h3>
                {wisdomOfDay.rishi && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    â€” {wisdomOfDay.rishi}
                  </div>
                )}
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, margin: 0 }}>
              "{wisdomOfDay.body}"
            </p>
            <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, borderLeft: `3px solid ${wisdomOfDay.color}` }}>
              <span style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1 }}>
                {wisdomOfDay.type.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Top Buy Signals */}
        <div className="card" style={{ padding: 24, marginBottom: 32 }}>
          <div style={{ fontSize: 10, color: 'var(--accent-green)', letterSpacing: 2, marginBottom: 16, fontWeight: 700 }}>
            ðŸ”¥ TOP BUY SIGNALS
          </div>
          {topBuys.map((t, i) => {
            const s = STOCKS[t.sym as keyof typeof STOCKS];
            return (
              <Link key={t.sym} href={`/stock/${t.sym}`}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border-subtle)', textDecoration: 'none' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 20 }}>#{i + 1}</span>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 700, width: 90, fontSize: 13 }}>{t.sym}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 11, flex: 1 }}>{s?.name}</span>
                <div style={{ width: 60, height: 5, background: 'var(--border-primary)', borderRadius: 3 }}>
                  <div style={{ width: `${t.score}%`, height: '100%', background: scoreColor(t.score), borderRadius: 3 }} />
                </div>
                <span style={{ color: scoreColor(t.score), fontWeight: 700, width: 28, textAlign: 'right' }}>{t.score}</span>
              </Link>
            );
          })}
        </div>

        {/* Markets Tabs */}
        <div className="card" style={{ padding: 24, marginBottom: 32 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border-primary)', paddingBottom: 16 }}>
            {([
              { key: 'indexes',     label: 'ðŸ‡®ðŸ‡³ Indian Indexes' },
              { key: 'commodities', label: 'âš¡ Commodities'     },
              { key: 'crypto',      label: 'â‚¿ Crypto'          },
            ] as const).map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '8px 18px', borderRadius: 8, fontSize: 12,
                  fontWeight: activeTab === tab.key ? 700 : 400,
                  border: 'none',
                  background: activeTab === tab.key ? 'var(--accent-gold)' : 'var(--bg-secondary)',
                  color: activeTab === tab.key ? '#000' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}>
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'indexes' && (
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Index</th>
                  <th style={{ textAlign: 'right' }}>Value</th>
                  <th style={{ textAlign: 'right' }}>Change %</th>
                  <th style={{ textAlign: 'right' }}>52W High</th>
                  <th style={{ textAlign: 'right' }}>52W Low</th>
                  <th style={{ textAlign: 'right' }}>P/E</th>
                  <th style={{ textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {INDIAN_INDEXES.map(idx => {
                  const pos = idx.changePct >= 0;
                  const isVix = idx.symbol === 'INDIAVIX';
                  const statusColor = isVix
                    ? (idx.value < 15 ? 'var(--accent-green)' : idx.value < 20 ? 'var(--accent-gold)' : 'var(--accent-red)')
                    : (pos ? 'var(--accent-green)' : 'var(--accent-red)');
                  const statusLabel = isVix
                    ? (idx.value < 15 ? 'CALM' : idx.value < 20 ? 'ALERT' : 'FEAR')
                    : (pos ? 'RISING' : 'FALLING');
                  return (
                    <tr key={idx.symbol}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{idx.flag} {idx.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{idx.symbol}</div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>{idx.value.toLocaleString('en-US')}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: pos ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        {pos ? 'â–²' : 'â–¼'} {Math.abs(idx.changePct).toFixed(2)}%
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: 12 }}>{idx.high52w.toLocaleString('en-US')}</td>
                      <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: 12 }}>{idx.low52w.toLocaleString('en-US')}</td>
                      <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: 12 }}>{idx.pe ? idx.pe + 'x' : 'â€”'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: `${statusColor}20`, color: statusColor }}>
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {activeTab === 'commodities' && (
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Commodity</th>
                  <th style={{ textAlign: 'right' }}>Price</th>
                  <th style={{ textAlign: 'right' }}>Change %</th>
                  <th style={{ textAlign: 'right' }}>52W Range</th>
                  <th style={{ textAlign: 'right' }}>Position</th>
                </tr>
              </thead>
              <tbody>
                {COMMODITIES.slice(0, 12).map(c => {
                  const range = c.high52w - c.low52w;
                  const pos = range > 0 ? ((c.price - c.low52w) / range) * 100 : 50;
                  return (
                    <tr key={c.symbol}>
                      <td>
                        <span style={{ fontSize: 18, marginRight: 8 }}>{c.emoji}</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>{c.category}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {c.price.toLocaleString('en-US')} <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.unit}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: c.changePct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        {c.changePct >= 0 ? 'â–²' : 'â–¼'} {Math.abs(c.changePct).toFixed(2)}%
                      </td>
                      <td style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-muted)' }}>
                        {c.low52w.toLocaleString()} â€” {c.high52w.toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <div style={{ width: 60, height: 5, background: 'var(--border-primary)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${pos}%`, height: '100%', background: pos >= 70 ? 'var(--accent-green)' : pos >= 30 ? 'var(--accent-gold)' : 'var(--accent-red)', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pos.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {activeTab === 'crypto' && (
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Asset</th>
                  <th style={{ textAlign: 'right' }}>Price</th>
                  <th style={{ textAlign: 'right' }}>24h</th>
                  <th style={{ textAlign: 'right' }}>7d</th>
                  <th style={{ textAlign: 'right' }}>Mkt Cap</th>
                  <th style={{ textAlign: 'right' }}>RSI</th>
                  <th style={{ textAlign: 'right' }}>MACD</th>
                </tr>
              </thead>
              <tbody>
                {CRYPTO_ASSETS.map(c => (
                  <tr key={c.symbol}>
                    <td>
                      <span style={{ fontSize: 18, marginRight: 8 }}>{c.emoji}</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.symbol}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>{c.name}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                      ${c.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: c.change24h >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {c.change24h >= 0 ? 'â–²' : 'â–¼'} {Math.abs(c.change24h).toFixed(2)}%
                    </td>
                    <td style={{ textAlign: 'right', color: c.change7d >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {c.change7d >= 0 ? '+' : ''}{c.change7d.toFixed(2)}%
                    </td>
                    <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-secondary)' }}>
                      ${(c.marketCap / 1e9).toFixed(1)}B
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: c.rsi >= 70 ? 'var(--accent-red)' : c.rsi >= 50 ? 'var(--accent-green)' : 'var(--accent-gold)' }}>
                      {c.rsi}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                        background: c.macd === 'BULLISH' ? 'rgba(0,186,124,0.15)' : c.macd === 'BEARISH' ? 'rgba(244,33,46,0.15)' : 'rgba(255,215,0,0.15)',
                        color: c.macd === 'BULLISH' ? 'var(--accent-green)' : c.macd === 'BEARISH' ? 'var(--accent-red)' : 'var(--accent-gold)',
                      }}>{c.macd}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', paddingTop: 24, borderTop: '1px solid var(--border-primary)' }}>
          NOT INVESTMENT ADVICE Â· EDUCATIONAL SIMULATION Â· RISHI TERMINAL v4.0
        </div>

      </div>
    </main>
  );
}