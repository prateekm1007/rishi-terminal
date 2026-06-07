'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { COMMODITIES } from '../../data/markets';
import { scoreJimRogers } from '../../lib/scorers/commodity/jimrogers';
import { scoreRickRule } from '../../lib/scorers/commodity/rickrule';
import { scoreDanielYergin } from '../../lib/scorers/commodity/danielyergin';
import { isPremium } from '../../lib/premium';
import { UpgradePrompt } from '../../components/premium/UpgradePrompt';
import { useLanguage } from '../../lib/language';
import { useLivePrices } from '../../hooks/useLivePrices';

const COMMODITY_RISHIS = [
  {
    id: 'jimrogers',
    name: 'Jim Rogers',
    tag: 'JR',
    bio: 'Co-founded Quantum Fund with Soros. Predicted the 2000s commodities supercycle. Author of Hot Commodities. Believes in owning physical assets over paper.',
    quote: 'Buy commodities. Buy them and put them away.',
    scorer: scoreJimRogers,
    target: 'GOLD',
  },
  {
    id: 'rickrule',
    name: 'Rick Rule',
    tag: 'RR',
    bio: 'Legendary resource sector investor. CEO of Sprott. Gold as savings, silver as speculation. Most people are speculating in gold when they should be saving in it.',
    quote: 'Gold is money. Everything else is credit.',
    scorer: scoreRickRule,
    target: 'SILVER',
  },
  {
    id: 'yergin',
    name: 'Daniel Yergin',
    tag: 'DY',
    bio: 'Pulitzer Prize-winning energy historian. Author of The Prize. VP at S&P Global. Energy transition and geopolitical oil expert.',
    quote: 'Oil is the lifeblood of the industrial civilization.',
    scorer: scoreDanielYergin,
    target: 'WTI',
  },
];

function scoreColor(score: number): string {
  if (score >= 75) return 'var(--accent-green)';
  if (score >= 55) return 'var(--accent-gold)';
  return 'var(--accent-red)';
}

function changeColor(change: number): string {
  if (change > 0) return 'var(--accent-green)';
  if (change < 0) return 'var(--accent-red)';
  return 'var(--text-muted)';
}

export default function CommoditiesPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [category, setCategory] = useState('All');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const premium = isPremium();

  // Pull symbols for live price fetching
  const commoditySymbols = useMemo(() => COMMODITIES.map(c => c.symbol), []);
  const { prices, loading, error, lastUpdated } = useLivePrices(commoditySymbols);

  // Merge live prices into commodities
  const enrichedCommodities = useMemo(() => {
    return COMMODITIES.map(c => {
      const live = prices[c.symbol];
      if (live && live.price > 0) {
        return {
          ...c,
          price:           live.price,
          changePercent:   live.changePercent24h,
          change24h:       live.changePercent24h,
        };
      }
      return { ...c, changePercent: 0, change24h: 0 };
    });
  }, [prices]);

  const categories = ['All', ...Array.from(new Set(enrichedCommodities.map(c => c.category)))];
  const filtered = category === 'All'
    ? enrichedCommodities
    : enrichedCommodities.filter(c => c.category === category);

  // Key stats from live data
  const goldData   = enrichedCommodities.find(c => c.symbol === 'GOLD');
  const silverData = enrichedCommodities.find(c => c.symbol === 'SILVER');
  const wtiData    = enrichedCommodities.find(c => c.symbol === 'WTI');
  const brentData  = enrichedCommodities.find(c => c.symbol === 'BRENT');

  return (
    <main className="page-bg">

      {showUpgrade && <UpgradePrompt reason="limit_reached" onClose={() => setShowUpgrade(false)} />}

      {/* Header */}
      <div className="page-header">
        <div className="content-wrapper">
          <div className="page-breadcrumb">
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI TERMINAL</Link>
            {' > '}
            <span>{t('commodities.breadcrumb')}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <h1 className="page-title" style={{ fontSize: 32, color: 'var(--accent-gold)' }}>
                {t('commodities.title')}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 600, lineHeight: 1.6 }}>
                {t('commodities.subtitle')}
              </p>
              {lastUpdated && (
                <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: 8 }}>
                  ⚡ Live • Updated {lastUpdated.toLocaleTimeString('en-IN')}
                </div>
              )}
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: '16px 24px', minWidth: 160 }}>
              <div style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 8 }}>
                COMMODITIES
              </div>
              <div style={{ fontSize: 48, fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-gold)', lineHeight: 1 }}>
                {enrichedCommodities.length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                Live Global Markets
              </div>
            </div>
          </div>

          {/* Live Key Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginTop: 24 }}>
            {[
              { label: 'GOLD (XAU/USD)',   data: goldData,   color: '#FFD700', bg: 'rgba(255,215,0,0.08)',   border: 'rgba(255,215,0,0.2)',   prefix: '$' },
              { label: 'SILVER (XAG/USD)', data: silverData, color: '#C0C0C0', bg: 'rgba(192,192,192,0.08)', border: 'rgba(192,192,192,0.2)', prefix: '$' },
              { label: 'WTI CRUDE',        data: wtiData,    color: '#f97316', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.2)',  prefix: '$' },
              { label: 'BRENT CRUDE',      data: brentData,  color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.2)',  prefix: '$' },
            ].map(stat => (
              <div key={stat.label} style={{
                background: stat.bg,
                border: '1px solid ' + stat.border,
                borderRadius: 10,
                padding: '12px 16px',
              }}>
                <div style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 4, letterSpacing: 1 }}>
                  {stat.label}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <div style={{ fontSize: 20, fontFamily: 'monospace', fontWeight: 700, color: stat.color }}>
                    {loading ? '...' : stat.data ? stat.prefix + stat.data.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                  </div>
                  {!loading && stat.data && (
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: changeColor(stat.data.change24h) }}>
                      {stat.data.change24h > 0 ? '+' : ''}{stat.data.change24h.toFixed(2)}%
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="content-wrapper" style={{ padding: '12px 24px' }}>
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 16px', fontSize: 12, color: 'var(--accent-red)' }}>
            ⚠ {error} — showing last known prices
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="content-wrapper" style={{ padding: '20px 24px 0' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                border: '1px solid ' + (category === cat ? 'var(--accent-gold)' : 'var(--border-primary)'),
                background: category === cat ? 'rgba(255,215,0,0.1)' : 'transparent',
                color: category === cat ? 'var(--accent-gold)' : 'var(--text-muted)',
                fontSize: 11,
                fontFamily: 'monospace',
                cursor: 'pointer',
                letterSpacing: 1,
              }}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Commodities Grid */}
      <div className="content-wrapper" style={{ padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filtered.map(commodity => {
            const isExpanded  = expandedCard === commodity.symbol;
            const rishiScores = COMMODITY_RISHIS.map(r => ({ ...r, result: r.scorer(commodity) }));
            const avgScore    = Math.round(rishiScores.reduce((s, r) => s + r.result.score, 0) / rishiScores.length);
            const isLive      = !!prices[commodity.symbol];

            return (
              <div
                key={commodity.symbol}
                className="card-sacred"
                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={() => {
                  if (!premium && commodity.category !== 'Energy') {
                    setShowUpgrade(true);
                    return;
                  }
                  router.push('/commodities/' + commodity.symbol);
                }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 32 }}>{commodity.emoji}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
                        {commodity.name}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', letterSpacing: 1 }}>
                        {commodity.symbol} • {commodity.category}
                        {isLive && (
                          <span style={{ color: 'var(--accent-green)', marginLeft: 6 }}>⚡ LIVE</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 700,
                    padding: '4px 10px', borderRadius: 6,
                    background: scoreColor(avgScore) + '20',
                    color: scoreColor(avgScore),
                    fontFamily: 'monospace',
                  }}>
                    {avgScore}
                  </div>
                </div>

                {/* Price */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                  <div style={{ fontSize: 28, fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {loading && !prices[commodity.symbol]
                      ? '...'
                      : '$' + commodity.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    }
                  </div>
                  <div style={{ fontSize: 13, fontFamily: 'monospace', color: changeColor(commodity.change24h), fontWeight: 700 }}>
                    {commodity.change24h > 0 ? '+' : ''}{commodity.change24h.toFixed(2)}%
                  </div>
                </div>

                {/* 52W Range Bar */}
                {commodity.high52w && commodity.low52w && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 4 }}>
                      <span>${commodity.low52w.toLocaleString()}</span>
                      <span>52W RANGE</span>
                      <span>${commodity.high52w.toLocaleString()}</span>
                    </div>
                    <div style={{ height: 3, background: 'var(--bg-secondary)', borderRadius: 2 }}>
                      <div style={{
                        height: '100%', borderRadius: 2,
                        width: Math.min(100, Math.max(0,
                          ((commodity.price - commodity.low52w) / (commodity.high52w - commodity.low52w)) * 100
                        )) + '%',
                        background: 'linear-gradient(90deg, var(--accent-gold), var(--accent-green))',
                      }} />
                    </div>
                  </div>
                )}

                {/* Rishi Score Bar */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {rishiScores.map(r => (
                    <div key={r.id} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 3 }}>{r.tag}</div>
                      <div style={{ height: 3, borderRadius: 2, background: scoreColor(r.result.score) + '40' }}>
                        <div style={{ height: '100%', borderRadius: 2, width: r.result.score + '%', background: scoreColor(r.result.score) }} />
                      </div>
                      <div style={{ fontSize: 9, fontFamily: 'monospace', color: scoreColor(r.result.score), marginTop: 2 }}>
                        {r.result.score}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}