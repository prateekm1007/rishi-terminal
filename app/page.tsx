'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { STOCKS } from '../data/stocks';
import { buildConsensus } from '../lib/consensus';
import { getCurrentTier, TIER_CONFIG } from '../lib/premium';
import { useLanguage } from '../lib/language';

const MARKET_INDICES = [
  { name: 'NIFTY 50',     value: '24,850',  change: '+0.75%', up: true  },
  { name: 'SENSEX',       value: '81,920',  change: '+0.68%', up: true  },
  { name: 'NIFTY MIDCAP', value: '12,450',  change: '+1.15%', up: true  },
  { name: 'NIFTY BANK',   value: '52,340',  change: '-0.22%', up: false },
  { name: 'S&P 500',      value: '5,850',   change: '+0.78%', up: true  },
  { name: 'NASDAQ',       value: '18,450',  change: '+1.22%', up: true  },
];

export default function Dashboard() {
  const [time, setTime]                   = useState('');
  const [search, setSearch]               = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [tier, setTier]                   = useState('seeker');
  const [livePrices, setLivePrices]       = useState<any>(null);
  const [priceUpdatedAt, setPriceUpdatedAt] = useState<Date | null>(null);
  const searchRef                         = useRef<HTMLDivElement>(null);
  const { t, locale }                     = useLanguage();

  const allSymbols = Object.keys(STOCKS);

  // Fetch live prices every 60 seconds
  useEffect(() => {
    async function fetchPrices() {
      try {
        const res  = await fetch('/api/prices');
        const data = await res.json();
        setLivePrices(data);
        setPriceUpdatedAt(new Date());
      } catch (error) {
        console.error('Failed to fetch prices:', error);
      }
    }
    
    // Fetch immediately on mount
    fetchPrices();
    
    // Then fetch every 60 seconds
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setTier(getCurrentTier());
    const tick = () =>
      setTime(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (search.length < 1) { setSearchResults([]); return; }
    const q = search.toUpperCase();
    setSearchResults(
      allSymbols
        .filter(s => s.includes(q) || (STOCKS[s]?.name ?? '').toUpperCase().includes(q))
        .slice(0, 6)
    );
  }, [search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setSearchResults([]);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const MARKET_SECTIONS = useMemo(() => [
    {
      id: 'crypto',
      href: '/crypto',
      label: t('marketSections.crypto'),
      tag: t('marketSections.cryptoTag'),
      color: '#F7931A',
      bgColor: 'rgba(247,147,26,0.06)',
      borderColor: 'rgba(247,147,26,0.2)',
      items: [
        {
          name: 'BTC',
          value: livePrices?.BTC?.price ? '$' + Number(livePrices.BTC.price).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '$79,683',
          change: livePrices?.BTC?.change ? (livePrices.BTC.change > 0 ? '+' : '') + livePrices.BTC.change.toFixed(2) + '%' : '-2.07%',
          up: livePrices?.BTC?.change != null ? livePrices.BTC.change > 0 : false,
        },
        {
          name: 'ETH',
          value: livePrices?.ETH?.price ? '$' + Number(livePrices.ETH.price).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '$2,283',
          change: livePrices?.ETH?.change ? (livePrices.ETH.change > 0 ? '+' : '') + livePrices.ETH.change.toFixed(2) + '%' : '-2.78%',
          up: livePrices?.ETH?.change != null ? livePrices.ETH.change > 0 : false,
        },
        {
          name: 'BNB',
          value: livePrices?.BNB?.price ? '$' + Number(livePrices.BNB.price).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '$612',
          change: livePrices?.BNB?.change ? (livePrices.BNB.change > 0 ? '+' : '') + livePrices.BNB.change.toFixed(2) + '%' : '-0.43%',
          up: livePrices?.BNB?.change != null ? livePrices.BNB.change > 0 : false,
        },
        {
          name: 'SOL',
          value: livePrices?.SOL?.price ? '$' + Number(livePrices.SOL.price).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '$185',
          change: livePrices?.SOL?.change ? (livePrices.SOL.change > 0 ? '+' : '') + livePrices.SOL.change.toFixed(2) + '%' : '+4.21%',
          up: livePrices?.SOL?.change != null ? livePrices.SOL.change > 0 : true,
        },
      ],
    },
    {
      id: 'forex',
      href: '/forex',
      label: t('marketSections.forex'),
      tag: t('marketSections.forexTag'),
      color: '#60A5FA',
      bgColor: 'rgba(96,165,250,0.06)',
      borderColor: 'rgba(96,165,250,0.2)',
      items: [
        {
          name: 'USD/INR',
          value: livePrices?.INR?.price ? Number(livePrices.INR.price).toFixed(2) : '83.92',
          change: livePrices?.INR?.change ? (livePrices.INR.change > 0 ? '+' : '') + livePrices.INR.change.toFixed(2) + '%' : '+0.12%',
          up: livePrices?.INR?.change != null ? livePrices.INR.change > 0 : true,
        },
        {
          name: 'EUR/INR',
          value: livePrices?.EUR_INR?.price ? Number(livePrices.EUR_INR.price).toFixed(2) : '90.14',
          change: livePrices?.EUR_INR?.change ? (livePrices.EUR_INR.change > 0 ? '+' : '') + livePrices.EUR_INR.change.toFixed(2) + '%' : '-0.08%',
          up: livePrices?.EUR_INR?.change != null ? livePrices.EUR_INR.change > 0 : false,
        },
        {
          name: 'GBP/INR',
          value: livePrices?.GBP_INR?.price ? Number(livePrices.GBP_INR.price).toFixed(2) : '106.40',
          change: livePrices?.GBP_INR?.change ? (livePrices.GBP_INR.change > 0 ? '+' : '') + livePrices.GBP_INR.change.toFixed(2) + '%' : '+0.21%',
          up: livePrices?.GBP_INR?.change != null ? livePrices.GBP_INR.change > 0 : true,
        },
        {
          name: 'JPY/INR',
          value: livePrices?.JPY_INR?.price ? Number(livePrices.JPY_INR.price).toFixed(4) : '0.5542',
          change: livePrices?.JPY_INR?.change ? (livePrices.JPY_INR.change > 0 ? '+' : '') + livePrices.JPY_INR.change.toFixed(2) + '%' : '-0.34%',
          up: livePrices?.JPY_INR?.change != null ? livePrices.JPY_INR.change > 0 : false,
        },
      ],
    },
    {
      id: 'commodities',
      href: '/commodities',
      label: t('marketSections.commodities'),
      tag: t('marketSections.commoditiesTag'),
      color: '#34D399',
      bgColor: 'rgba(52,211,153,0.06)',
      borderColor: 'rgba(52,211,153,0.2)',
      items: [
        {
          name: 'GOLD',
          value: livePrices?.GOLD?.price ? '$' + Number(livePrices.GOLD.price).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '$2,334',
          change: livePrices?.GOLD?.change ? (livePrices.GOLD.change > 0 ? '+' : '') + livePrices.GOLD.change.toFixed(2) + '%' : '+0.54%',
          up: livePrices?.GOLD?.change != null ? livePrices.GOLD.change > 0 : true,
        },
        {
          name: 'SILVER',
          value: livePrices?.SILVER?.price ? '$' + Number(livePrices.SILVER.price).toFixed(2) : '$29.40',
          change: livePrices?.SILVER?.change ? (livePrices.SILVER.change > 0 ? '+' : '') + livePrices.SILVER.change.toFixed(2) + '%' : '+1.12%',
          up: livePrices?.SILVER?.change != null ? livePrices.SILVER.change > 0 : true,
        },
        {
          name: 'CRUDE',
          value: livePrices?.CRUDE?.price ? '$' + Number(livePrices.CRUDE.price).toFixed(2) : '$82.60',
          change: livePrices?.CRUDE?.change ? (livePrices.CRUDE.change > 0 ? '+' : '') + livePrices.CRUDE.change.toFixed(2) + '%' : '-1.34%',
          up: livePrices?.CRUDE?.change != null ? livePrices.CRUDE.change > 0 : false,
        },
        {
          name: 'NAT GAS',
          value: livePrices?.NAT_GAS?.price ? '$' + Number(livePrices.NAT_GAS.price).toFixed(2) : '$2.84',
          change: livePrices?.NAT_GAS?.change ? (livePrices.NAT_GAS.change > 0 ? '+' : '') + livePrices.NAT_GAS.change.toFixed(2) + '%' : '+2.10%',
          up: livePrices?.NAT_GAS?.change != null ? livePrices.NAT_GAS.change > 0 : true,
        },
      ],
    },
    {
      id: 'bonds',
      href: '/bonds',
      label: t('marketSections.bonds'),
      tag: t('marketSections.bondsTag'),
      color: '#A78BFA',
      bgColor: 'rgba(167,139,250,0.06)',
      borderColor: 'rgba(167,139,250,0.2)',
      items: [
        { name: 'IN 10Y', value: '7.08%', change: '-0.02%', up: false },
        { name: 'US 10Y', value: '4.42%', change: '+0.03%', up: true  },
        { name: 'IN 2Y',  value: '6.94%', change: '-0.01%', up: false },
        { name: 'US 30Y', value: '4.68%', change: '+0.04%', up: true  },
      ],
    },
    {
      id: 'news',
      href: '/news',
      label: t('marketSections.news'),
      tag: t('marketSections.newsTag'),
      color: '#FB923C',
      bgColor: 'rgba(251,146,60,0.06)',
      borderColor: 'rgba(251,146,60,0.2)',
      items: [
        { name: 'RBI holds repo rate at 6.5% for 8th consecutive time', change: 'MACRO',   up: true },
        { name: 'Nifty hits fresh all-time high above 24,850',           change: 'MARKETS', up: true },
        { name: 'FII inflows surge to Rs 12,400 Cr this week',           change: 'FLOWS',   up: true },
        { name: 'India Q2 GDP growth at 6.7%, beats estimates',          change: 'ECONOMY', up: true },
      ],
      isNews: true,
    },
  ], [t, locale, livePrices]);

  const WISDOM_QUOTES = useMemo(() => [
    { rishi: 'Warren Buffett',      initials: 'WB', quote: t('rishiQuotes.buffett1') },
    { rishi: 'Benjamin Graham',     initials: 'BG', quote: t('rishiQuotes.graham1') },
    { rishi: 'Charlie Munger',      initials: 'CM', quote: t('rishiQuotes.munger1') },
    { rishi: 'Peter Lynch',         initials: 'PL', quote: t('rishiQuotes.lynch1') },
    { rishi: 'Rakesh Jhunjhunwala', initials: 'RJ', quote: t('rishiQuotes.jhunjhunwala1') },
    { rishi: 'George Soros',        initials: 'GS', quote: t('rishiQuotes.soros1') },
    { rishi: 'Radhakishan Damani',  initials: 'RD', quote: t('rishiQuotes.damani1') },
  ], [t]);

  const scoreColor = (s: number) =>
    s >= 75 ? 'var(--accent-green)' : s >= 55 ? 'var(--accent-gold)' : 'var(--accent-red)';

  const topBuys = allSymbols
    .map(sym => ({ sym, score: buildConsensus(STOCKS[sym]).consensus }))
    .filter(x => x.score >= 65)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const stockOfDay  = topBuys.length > 0 ? topBuys[0].sym : 'RELIANCE';
  const stockData   = STOCKS[stockOfDay];
  const sotdScore   = buildConsensus(stockData).consensus;
  const dayIndex    = Math.floor(Date.now() / 86400000) % WISDOM_QUOTES.length;
  const dailyWisdom = WISDOM_QUOTES[dayIndex];
  const tierConfig  = TIER_CONFIG[tier as keyof typeof TIER_CONFIG];

  // Format time since last update
  const getTimeSinceUpdate = () => {
    if (!priceUpdatedAt) return 'updating...';
    const now = new Date();
    const seconds = Math.floor((now.getTime() - priceUpdatedAt.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  return (
    <main className="page-container">

      {/* Page Header */}
      <div className="page-header">
        <div className="content-wrapper" style={{ padding: '0 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 className="philosophy-heading" style={{ fontSize: 28, color: 'var(--accent-gold)', letterSpacing: 3 }}>
                {t('header.title')}
              </h1>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2, marginTop: 4 }}>
                {t('header.subtitle')}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <Link href="/pricing" style={{
                padding: '6px 14px',
                background: tier === 'disciple' ? 'rgba(192,132,252,0.15)' : tier === 'student' ? 'rgba(255,215,0,0.15)' : 'var(--bg-secondary)',
                color: tier === 'disciple' ? '#c084fc' : tier === 'student' ? 'var(--accent-gold)' : 'var(--text-muted)',
                border: '1px solid ' + (tier === 'disciple' ? '#c084fc' : tier === 'student' ? 'var(--accent-gold)' : 'var(--border-primary)'),
                borderRadius: 20, fontSize: 11, fontWeight: 700, textDecoration: 'none', letterSpacing: 1,
              }}>
                {tierConfig?.label?.toUpperCase() || 'SEEKER'}
              </Link>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 16, color: 'var(--accent-gold)', fontWeight: 700, fontFamily: 'monospace' }}>
                  {time} {t('header.time')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {t('header.exchanges')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="content-wrapper" style={{ padding: '28px 24px' }}>

        {/* Search */}
        <div ref={searchRef} style={{ position: 'relative', marginBottom: 28 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('common.search')}
            style={{
              width: '100%', padding: '14px 18px', borderRadius: 10, fontSize: 14,
              boxSizing: 'border-box', background: 'var(--bg-card)',
              border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none',
            }}
          />
          {searchResults.length > 0 && (
            <div style={{
              position: 'absolute', top: '110%', left: 0, right: 0,
              background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
              borderRadius: 10, zIndex: 100, overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}>
              {searchResults.map(sym => {
                const s    = STOCKS[sym];
                const comp = buildConsensus(s).consensus;
                return (
                  <Link
                    key={sym}
                    href={'/stock/' + sym}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 18px', borderBottom: '1px solid var(--border-subtle)',
                      textDecoration: 'none',
                    }}
                    onClick={() => { setSearch(''); setSearchResults([]); }}
                  >
                    <span style={{ color: 'var(--accent-gold)', fontWeight: 700, fontSize: 13 }}>{sym}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12, flex: 1, marginLeft: 16 }}>{s?.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11, marginRight: 16 }}>{s?.sector}</span>
                    <span style={{ color: scoreColor(comp), fontWeight: 700, fontSize: 13 }}>{comp}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Market Index Ticker */}
        <div className="card-sacred" style={{ padding: '12px 20px', marginBottom: 28, overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {MARKET_INDICES.map((idx, i) => (
              <div key={idx.name} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '6px 20px',
                borderRight: i < MARKET_INDICES.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', letterSpacing: 0.5 }}>
                  {idx.name}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                  {idx.value}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: idx.up ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {idx.change}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Stock of Day + Daily Wisdom */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>

          <div className="card-sacred wisdom-reveal" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: 'linear-gradient(90deg, transparent, var(--accent-gold), transparent)',
            }} />
            <div style={{ fontSize: 9, color: 'var(--accent-gold)', letterSpacing: 2, marginBottom: 12, fontFamily: 'monospace' }}>
              {t('dashboard.stockOfDay')}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-gold)', fontFamily: 'monospace', letterSpacing: 1 }}>
                  {stockOfDay}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 4 }}>{stockData.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{stockData.sector}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 42, fontWeight: 700, fontFamily: 'monospace', color: scoreColor(sotdScore), lineHeight: 1 }}>
                  {sotdScore}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4, letterSpacing: 1 }}>
                  {t('dashboard.rishiConsensus')}
                </div>
              </div>
            </div>
            <Link href={'/stock/' + stockOfDay} style={{
              display: 'block', padding: '10px', textAlign: 'center',
              background: 'var(--accent-gold)', color: '#000', borderRadius: 8,
              fontWeight: 700, fontSize: 12, textDecoration: 'none', letterSpacing: 1,
            }}>
              {t('dashboard.viewFullAnalysis')}
            </Link>
          </div>

          <div className="card-sacred wisdom-reveal-delay-1" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: 'linear-gradient(90deg, transparent, var(--accent-gold), transparent)',
            }} />
            <div style={{ fontSize: 9, color: 'var(--accent-gold)', letterSpacing: 2, marginBottom: 16, fontFamily: 'monospace' }}>
              {t('dashboard.wisdomOfDay')}
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: 'var(--accent-gold)',
                fontFamily: 'monospace', flexShrink: 0,
              }}>
                {dailyWisdom.initials}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {dailyWisdom.rishi}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {t('dashboard.masterInvestor')}
                </div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, fontStyle: 'italic', margin: 0 }}>
              "{dailyWisdom.quote}"
            </p>
            <div style={{ marginTop: 16 }}>
              <Link href="/rishis" style={{ fontSize: 12, color: 'var(--accent-gold)', textDecoration: 'none', fontWeight: 700 }}>
                {t('common.exploreAllRishis')} {'>'}
              </Link>
            </div>
          </div>
        </div>

        {/* Markets Overview with Live Update Indicator */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 3, fontFamily: 'monospace' }}>
              {t('dashboard.globalMarkets')}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace', letterSpacing: 0.5 }}>
              {livePrices ? (
                <span style={{ color: 'var(--accent-green)' }}>
                  ● Live • Updated {getTimeSinceUpdate()}
                </span>
              ) : (
                <span>Loading prices...</span>
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: 16 }}>
            {MARKET_SECTIONS.map(section => (
              <Link key={section.id} href={section.href} style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    padding: 20,
                    background: section.bgColor,
                    border: '1px solid ' + section.borderColor,
                    borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = section.color;
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px ' + section.color + '18';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = section.borderColor;
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: section.color, letterSpacing: 0.5 }}>
                        {section.label}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginTop: 2 }}>
                        {section.tag}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 9, fontFamily: 'monospace', letterSpacing: 1,
                      color: section.color, opacity: 0.8,
                      border: '1px solid ' + section.color + '40',
                      padding: '3px 8px', borderRadius: 4,
                    }}>
                      {t('common.viewAll')} {'>'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {section.items.map((item, i) => (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '6px 0',
                        borderBottom: i < section.items.length - 1 ? '1px solid ' + section.borderColor : 'none',
                      }}>
                        {section.isNews ? (
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4, flex: 1, paddingRight: 8 }}>
                            {item.name}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {item.name}
                          </span>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                          {!section.isNews && (
                            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                              {item.value}
                            </span>
                          )}
                          <span style={{
                            fontSize: 10, fontWeight: 700, fontFamily: 'monospace',
                            color: item.up ? 'var(--accent-green)' : 'var(--accent-red)', marginTop: 2,
                          }}>
                            {item.change}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Top Buy Signals */}
        <div className="card-sacred wisdom-reveal-delay-2" style={{ padding: 24, marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 9, color: 'var(--accent-green)', letterSpacing: 3, fontFamily: 'monospace' }}>
              {t('dashboard.topBuySignals')}
            </div>
            <Link href="/screener" style={{ fontSize: 11, color: 'var(--accent-gold)', textDecoration: 'none', fontFamily: 'monospace', letterSpacing: 1 }}>
              {t('dashboard.fullScreener')} {'>'}
            </Link>
          </div>
          {topBuys.map((item, i) => {
            const s = STOCKS[item.sym];
            return (
              <Link
                key={item.sym}
                href={'/stock/' + item.sym}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 0', borderBottom: '1px solid var(--border-subtle)',
                  textDecoration: 'none', transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.paddingLeft = '6px'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.paddingLeft = '0px'}
              >
                <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 22, fontFamily: 'monospace' }}>
                  #{i + 1}
                </span>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 700, width: 110, fontSize: 13, fontFamily: 'monospace', letterSpacing: 1 }}>
                  {item.sym}
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 12, flex: 1 }}>
                  {s?.name}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 100, textAlign: 'right' }}>
                  {s?.sector}
                </span>
                <div style={{ width: 90, height: 4, background: 'var(--border-primary)', borderRadius: 3, marginLeft: 12 }}>
                  <div style={{
                    width: item.score + '%', height: '100%',
                    background: scoreColor(item.score), borderRadius: 3, transition: 'width 0.8s ease',
                  }} />
                </div>
                <span style={{ color: scoreColor(item.score), fontWeight: 700, width: 32, textAlign: 'right', fontSize: 14, fontFamily: 'monospace' }}>
                  {item.score}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Quick Nav Pills */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
          {[
            { href: '/screener',    label: t('nav.screener')    },
            { href: '/portfolio',   label: t('nav.portfolio')   },
            { href: '/rishis',      label: t('nav.allRishis')   },
            { href: '/news',        label: t('nav.news')        },
            { href: '/crypto',      label: t('nav.crypto')      },
            { href: '/forex',       label: t('nav.forex')       },
            { href: '/commodities', label: t('nav.commodities') },
            { href: '/bonds',       label: t('nav.bonds')       },
            { href: '/watchlist',   label: t('nav.watchlist')   },
            { href: '/pricing',     label: t('tiers.upgrade')   },
          ].map(nav => (
            <Link
              key={nav.href}
              href={nav.href}
              style={{
                padding: '8px 18px', borderRadius: 20, textDecoration: 'none',
                fontSize: 12, fontFamily: 'monospace',
                color: nav.href === '/pricing' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                background: 'var(--bg-card)',
                border: nav.href === '/pricing' ? '1px solid rgba(255,215,0,0.4)' : '1px solid var(--border-primary)',
                transition: 'all 0.15s ease', letterSpacing: 0.5,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-gold)';
                (e.currentTarget as HTMLElement).style.color = 'var(--accent-gold)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = nav.href === '/pricing' ? 'rgba(255,215,0,0.4)' : 'var(--border-primary)';
                (e.currentTarget as HTMLElement).style.color = nav.href === '/pricing' ? 'var(--accent-gold)' : 'var(--text-secondary)';
              }}
            >
              {nav.label}
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center', fontSize: 11, color: 'var(--text-muted)',
          paddingTop: 24, borderTop: '1px solid var(--border-primary)',
        }}>
          {t('dashboard.notInvestmentAdvice')}
        </div>

      </div>
    </main>
  );
}