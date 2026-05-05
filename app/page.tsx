'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { STOCKS } from '../data/stocks';
import { buildConsensus } from '../lib/consensus';
import { getCurrentTier, TIER_CONFIG } from '../lib/premium';

export default function Dashboard() {
  const [time, setTime] = useState('');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [tier, setTier] = useState('seeker');
  const searchRef = useRef<HTMLDivElement>(null);

  const allSymbols = Object.keys(STOCKS);

  useEffect(() => {
    setTier(getCurrentTier());
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
    { rishi: 'Warren Buffett', quote: 'The three most important words in investing are margin of safety.', emoji: 'B' },
    { rishi: 'Benjamin Graham', quote: 'An investment operation promises safety of principal and an adequate return.', emoji: 'G' },
    { rishi: 'Charlie Munger', quote: 'The best thing that happens to us is when a great company gets into temporary trouble.', emoji: 'M' },
    { rishi: 'Peter Lynch', quote: 'Know what you own and why you own it.', emoji: 'L' },
    { rishi: 'Rakesh Jhunjhunwala', quote: 'I believe in buying quality businesses and holding them for the long term.', emoji: 'RJ' },
    { rishi: 'George Soros', quote: 'Markets are constantly in a state of uncertainty and flux. Money is made by discounting the obvious.', emoji: 'GS' },
    { rishi: 'Radhakishan Damani', quote: 'Buy businesses that are simple to understand and have a long runway of growth.', emoji: 'D' },
  ];

  const dayIndex = Math.floor(Date.now() / 86400000) % wisdomQuotes.length;
  const dailyWisdom = wisdomQuotes[dayIndex];
  const tierConfig = TIER_CONFIG[tier as keyof typeof TIER_CONFIG];

  return (
    <main className="page-container">

      <div className="page-header">
        <div className="content-wrapper" style={{ padding: '0 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 className="philosophy-heading" style={{ fontSize: 28, color: 'var(--accent-gold)', letterSpacing: 3 }}>
                RISHI TERMINAL
              </h1>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2, marginTop: 4 }}>
                20 RISHIS GUIDE EVERY DECISION - STOCKS - CRYPTO - COMMODITIES
              </p>
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <Link href="/pricing" style={{
                padding: '6px 14px',
                background: tier === 'disciple' ? 'rgba(192,132,252,0.15)' : tier === 'student' ? 'rgba(255,215,0,0.15)' : 'var(--bg-secondary)',
                color: tier === 'disciple' ? '#c084fc' : tier === 'student' ? 'var(--accent-gold)' : 'var(--text-muted)',
                border: `1px solid ${tier === 'disciple' ? '#c084fc' : tier === 'student' ? 'var(--accent-gold)' : 'var(--border-primary)'}`,
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                textDecoration: 'none',
                letterSpacing: 1,
              }}>
                {tierConfig?.label?.toUpperCase() || 'SEEKER'}
              </Link>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 16, color: 'var(--accent-gold)', fontWeight: 700 }}>{time} IST</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>NSE - BSE - MCX - GLOBAL</div>
              </div>
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
            style={{ width: '100%', padding: '14px 18px', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' }}
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
            { href: '/backtest',    label: 'Backtest'    },
            { href: '/crypto',      label: 'Crypto'      },
            { href: '/news',        label: 'News'        },
            { href: '/pricing',     label: 'Upgrade'     },
          ].map(nav => (
            <Link key={nav.href} href={nav.href}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '14px 8px', borderRadius: 10, textDecoration: 'none',
                color: nav.href === '/pricing' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                fontSize: 11, gap: 6,
                background: 'var(--bg-card)',
                border: nav.href === '/pricing' ? '1px solid rgba(255,215,0,0.3)' : '1px solid var(--border-primary)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-gold)';
                (e.currentTarget as HTMLElement).style.color = 'var(--accent-gold)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = nav.href === '/pricing' ? 'rgba(255,215,0,0.3)' : 'var(--border-primary)';
                (e.currentTarget as HTMLElement).style.color = nav.href === '/pricing' ? 'var(--accent-gold)' : 'var(--text-secondary)';
              }}
            >
              <span>{nav.label}</span>
            </Link>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>

          <div className="card card-sacred wisdom-reveal" style={{ padding: 24 }}>
            <div className="philosophy-subheading" style={{ fontSize: 10, color: 'var(--accent-gold)', letterSpacing: 2, marginBottom: 16 }}>
              STOCK OF THE DAY - {stockOfDay}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div className="philosophy-subheading" style={{ fontSize: 18, color: 'var(--text-primary)' }}>{stockData.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{stockData.sector} NSE</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="score-reveal" style={{ fontSize: 36, fontWeight: 700, color: scoreColor(sotdConsensus), lineHeight: 1 }}>{sotdConsensus}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>20 Rishi Consensus</div>
              </div>
            </div>
            <Link href={`/stock/${stockOfDay}`} style={{
              display: 'block', padding: '10px', textAlign: 'center',
              background: 'var(--accent-gold)', color: '#000', borderRadius: 8,
              fontWeight: 700, fontSize: 13, textDecoration: 'none',
              fontFamily: 'Cinzel, serif', letterSpacing: 1,
            }}>
              View Full Rishi Analysis
            </Link>
          </div>

          <div className="card card-sacred wisdom-reveal-delay-1" style={{ padding: 24 }}>
            <div className="philosophy-subheading" style={{ fontSize: 10, color: 'var(--accent-gold)', letterSpacing: 2, marginBottom: 16 }}>
              RISHI WISDOM OF THE DAY
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-start' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(255,215,0,0.1)',
                border: '1px solid rgba(255,215,0,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: 'var(--accent-gold)',
                fontFamily: 'Cinzel, serif', flexShrink: 0,
              }}>
                {dailyWisdom.emoji}
              </div>
              <div>
                <div className="philosophy-subheading" style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {dailyWisdom.rishi}
                </div>
              </div>
            </div>
            <p className="rishi-insight" style={{ fontSize: 13 }}>
              "{dailyWisdom.quote}"
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <Link href="/rishis" style={{ fontSize: 12, color: 'var(--accent-gold)', textDecoration: 'none', fontWeight: 700 }}>
                Explore All 20 Rishis
              </Link>
              <span style={{ color: 'var(--border-primary)' }}>|</span>
              <Link href="/backtest" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>
                Backtest this philosophy
              </Link>
            </div>
          </div>
        </div>

        <div className="card wisdom-reveal-delay-2" style={{ padding: 24, marginBottom: 32 }}>
          <div className="philosophy-subheading" style={{ fontSize: 10, color: 'var(--accent-green)', letterSpacing: 2, marginBottom: 16 }}>
            TOP BUY SIGNALS - RISHI CONSENSUS ABOVE 65
          </div>
          {topBuys.map((t, i) => {
            const s = STOCKS[t.sym as keyof typeof STOCKS];
            return (
              <Link key={t.sym} href={`/stock/${t.sym}`}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border-subtle)', textDecoration: 'none' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 20 }}>#{i + 1}</span>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 700, width: 100, fontSize: 13, fontFamily: 'Cinzel, serif' }}>{t.sym}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 11, flex: 1 }}>{s?.name}</span>
                <div style={{ width: 80, height: 4, background: 'var(--border-primary)', borderRadius: 3 }}>
                  <div style={{ width: `${t.score}%`, height: '100%', background: scoreColor(t.score), borderRadius: 3, transition: 'width 0.8s ease' }} />
                </div>
                <span style={{ color: scoreColor(t.score), fontWeight: 700, width: 28, textAlign: 'right' }}>{t.score}</span>
              </Link>
            );
          })}
        </div>

        <div className="card wisdom-reveal-delay-3" style={{ padding: 24, marginBottom: 32 }}>
          <div className="philosophy-subheading" style={{ fontSize: 10, color: 'var(--accent-gold)', letterSpacing: 2, marginBottom: 16 }}>
            MARKET INDEXES
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { name: 'NIFTY 50',     value: 24850, change: 0.75, href: '/index/NIFTY50'     },
              { name: 'SENSEX',       value: 81500, change: 0.68, href: '/index/SENSEX'       },
              { name: 'NIFTY MIDCAP', value: 12450, change: 1.15, href: '/index/NIFTYMIDCAP'  },
              { name: 'SP500',        value: 5850,  change: 0.78, href: '/index/SP500'        },
              { name: 'NASDAQ',       value: 18450, change: 1.22, href: '/index/NASDAQ'       },
              { name: 'DAX',          value: 18950, change: 0.45, href: '/index/DAX'          },
            ].map(idx => (
              <Link key={idx.name} href={idx.href}
                style={{
                  padding: '16px', background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 10, textDecoration: 'none', transition: 'all 0.2s ease',
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
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{idx.name}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 8 }}>{idx.value.toLocaleString()}</div>
                <div style={{ fontSize: 12, color: idx.change >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', marginTop: 4, fontWeight: 700 }}>
                  {idx.change >= 0 ? '+' : ''}{idx.change.toFixed(2)}%
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', paddingTop: 24, borderTop: '1px solid var(--border-primary)', marginTop: 32 }}>
          NOT INVESTMENT ADVICE - EDUCATIONAL SIMULATION - RISHI TERMINAL v4.1 - 20 RISHIS ACTIVE
        </div>

      </div>
    </main>
  );
}