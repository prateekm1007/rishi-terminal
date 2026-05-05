'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { STOCKS } from '../data/stocks';
import { buildConsensus } from '../lib/consensus';

export default function Dashboard() {
  const [time, setTime] = useState('');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  const allSymbols = Object.keys(STOCKS);

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

  const topBuys = allSymbols
    .map(sym => ({ sym, score: buildConsensus(STOCKS[sym]).consensus }))
    .filter(x => x.score >= 65)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const stockOfDay = topBuys.length > 0 ? topBuys[0].sym : 'RELIANCE';
  const stockData = STOCKS[stockOfDay];
  const sotdConsensus = buildConsensus(stockData).consensus;

  const wisdomQuotes = [
    { rishi: 'Warren Buffett', quote: 'The three most important words in investing are margin of safety.', emoji: '🦁' },
    { rishi: 'Benjamin Graham', quote: 'An investment operation is one which, upon thorough analysis, promises safety of principal and an adequate return.', emoji: '📊' },
    { rishi: 'Charlie Munger', quote: 'The best thing that happens to us is when a great company gets into temporary trouble.', emoji: '🧠' },
    { rishi: 'Peter Lynch', quote: 'Know what you own and why you own it.', emoji: '🎯' },
    { rishi: 'Rakesh Jhunjhunwala', quote: 'I believe in buying quality businesses and holding them for the long term.', emoji: '💎' },
  ];

  const dailyWisdom = wisdomQuotes[Math.floor((Date.now() / 86400000) % wisdomQuotes.length)];

  return (
    <main className="page-container">

      <div className="page-header">
        <div className="content-wrapper" style={{ padding: '0 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 28, color: 'var(--accent-gold)', letterSpacing: 3, fontWeight: 700 }}>
                RISHI TERMINAL
              </h1>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2, marginTop: 4 }}>
                RISHIS GUIDE EVERY DECISION - STOCKS - BONDS - FOREX - CRYPTO - COMMODITIES
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 16, color: 'var(--accent-gold)', fontWeight: 700 }}>{time} IST</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>NSE - BSE - MCX - GLOBAL</div>
            </div>
          </div>
        </div>
      </div>

      <div className="content-wrapper">

        <div ref={searchRef} style={{ position: 'relative', marginBottom: 32, marginTop: 32 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search stocks - TITAN, INFY, Reliance..."
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
                const comp = buildConsensus(s).consensus;
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10, marginBottom: 40 }}>
          {[
            { href: '/screener',    label: 'Screener'    },
            { href: '/compare',     label: 'Compare'     },
            { href: '/portfolio',   label: 'Portfolio'   },
            { href: '/watchlist',   label: 'Watchlist'   },
            { href: '/rishis',      label: 'Rishis'      },
            { href: '/journal',     label: 'Journal'     },
            { href: '/bonds',       label: 'Bonds'       },
            { href: '/forex',       label: 'Forex'       },
            { href: '/news',        label: 'News'        },
            { href: '/crypto',      label: 'Crypto'      },
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
              <span>{nav.label}</span>
            </Link>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>

          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: 10, color: 'var(--accent-gold)', letterSpacing: 2, marginBottom: 16, fontWeight: 700 }}>
              STOCK OF THE DAY - {stockOfDay}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: 18, color: 'var(--text-primary)', fontWeight: 700 }}>{stockData.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{stockData.sector} NSE {stockData.price.toLocaleString('en-US')}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 36, fontWeight: 700, color: scoreColor(sotdConsensus), lineHeight: 1 }}>{sotdConsensus}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Rishi Consensus</div>
              </div>
            </div>
            <Link href={`/stock/${stockOfDay}`} style={{
              display: 'block', padding: '10px', textAlign: 'center',
              background: 'var(--accent-gold)', color: '#000', borderRadius: 8,
              fontWeight: 700, fontSize: 13, textDecoration: 'none',
            }}>
              View Full Analysis
            </Link>
          </div>

          <div className="card" style={{ padding: 24, background: 'linear-gradient(135deg, rgba(255,215,0,0.08) 0%, var(--bg-card) 100%)' }}>
            <div style={{ fontSize: 10, color: 'var(--accent-gold)', letterSpacing: 2, marginBottom: 12, fontWeight: 700 }}>
              RISHI WISDOM OF THE DAY
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 32 }}>{dailyWisdom.emoji}</div>
              <div>
                <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: 'var(--text-primary)', fontWeight: 700, margin: '0 0 4px 0' }}>
                  {dailyWisdom.rishi}
                </h3>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
              "{dailyWisdom.quote}"
            </p>
            <Link href="/rishis" style={{ display: 'block', marginTop: 16, fontSize: 12, color: 'var(--accent-gold)', textDecoration: 'none', fontWeight: 700 }}>
              Explore All Rishis
            </Link>
          </div>
        </div>

        <div className="card" style={{ padding: 24, marginBottom: 32 }}>
          <div style={{ fontSize: 10, color: 'var(--accent-green)', letterSpacing: 2, marginBottom: 16, fontWeight: 700 }}>
            TOP BUY SIGNALS (RISHI CONSENSUS ABOVE 65)
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

        <div className="card" style={{ padding: 24, marginBottom: 32 }}>
          <div style={{ fontSize: 10, color: 'var(--accent-gold)', letterSpacing: 2, marginBottom: 16, fontWeight: 700 }}>
            MARKET INDEXES
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { name: 'NIFTY 50', value: 24850, change: 0.75, href: '/index/NIFTY50' },
              { name: 'SENSEX', value: 81500, change: 0.68, href: '/index/SENSEX' },
              { name: 'NIFTY MIDCAP', value: 12450, change: 1.15, href: '/index/NIFTYMIDCAP' },
              { name: 'SP500', value: 5850, change: 0.78, href: '/index/SP500' },
              { name: 'NASDAQ', value: 18450, change: 1.22, href: '/index/NASDAQ' },
              { name: 'DAX', value: 18950, change: 0.45, href: '/index/DAX' },
            ].map(idx => (
              <Link key={idx.name} href={idx.href}
                style={{
                  padding: '16px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 10,
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-gold)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,215,0,0.05)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-primary)';
                  (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)';
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {idx.name}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 8 }}>
                  {idx.value.toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: idx.change >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', marginTop: 4, fontWeight: 700 }}>
                  {idx.change >= 0 ? '+' : ''}{idx.change.toFixed(2)}%
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', paddingTop: 24, borderTop: '1px solid var(--border-primary)', marginTop: 32 }}>
          NOT INVESTMENT ADVICE - EDUCATIONAL SIMULATION - RISHI TERMINAL v4.1
        </div>

      </div>
    </main>
  );
}