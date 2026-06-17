'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FOREX_PAIRS } from '../../data/forex';
import { useLanguage } from '../../lib/language';
import { useLivePrices } from '../../hooks/useLivePrices';

function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; below: boolean } | null>(null);

  const place = (el: HTMLElement) => {
    if (typeof window === 'undefined') return;
    const r = el.getBoundingClientRect();
    const pad = 10;
    const w = 280;

    let left = r.left + r.width / 2 - w / 2;
    left = Math.max(pad, Math.min(left, window.innerWidth - w - pad));

    const aboveTop = r.top - 12;
    const below = aboveTop < 70;
    const top = below ? (r.bottom + 10) : aboveTop;

    setPos({ top, left, below });
  };

  return (
    <span
      style={{ display: 'inline-block', marginLeft: 6, cursor: 'help' }}
      onMouseEnter={(e) => { place(e.currentTarget as HTMLElement); setShow(true); }}
      onMouseLeave={() => setShow(false)}
      onFocus={(e) => { place(e.currentTarget as HTMLElement); setShow(true); }}
      onBlur={() => setShow(false)}
      tabIndex={0}
      aria-label={text}
    >
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 14,
        height: 14,
        borderRadius: '50%',
        border: '1px solid var(--accent-gold)',
        color: 'var(--accent-gold)',
        fontSize: 9,
        fontWeight: 800,
        lineHeight: 1,
        verticalAlign: 'middle'
      }}>ⓘ</span>

      {show && pos && (
        <div style={{
          position: 'fixed',
          top: pos.top,
          left: pos.left,
          transform: pos.below ? 'none' : 'translateY(-100%)',
          width: 280,
          maxWidth: 'calc(100vw - 20px)',
          padding: '8px 12px',
          background: 'var(--bg-card)',
          border: '1px solid var(--accent-gold)',
          borderRadius: 8,
          fontSize: 11,
          color: 'var(--text-primary)',
          whiteSpace: 'normal',
          zIndex: 99999,
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          pointerEvents: 'none'
        }}>
          {text}
        </div>
      )}
    </span>
  );
}
export default function ForexPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const pairList = Object.values(FOREX_PAIRS);

  // Extract symbols for live price fetching
  const symbols = useMemo(() => pairList.map(p => p.pair), []);
  const { prices, loading, error, lastUpdated } = useLivePrices(symbols);

  // Merge live prices with static data
  const enrichedPairs = useMemo(() => {
    return pairList.map(pair => {
      const liveData = prices[pair.pair];
      if (liveData) {
        const liveSpot = liveData.price;
        const spread = (pair as any).spread || (pair.ask - pair.bid);
        return {
          ...pair,
          spotRate: liveSpot,
          bid: liveSpot - spread / 2,
          ask: liveSpot + spread / 2,
                    change24h:
            typeof liveData.changePercent24h === 'number'
              ? liveData.changePercent24h
              : (typeof (liveData as any).change === 'number' ? (liveData as any).change : 0),
          volume24h: liveData.volume24h || pair.volume24h,
        };
      }
      return { ...pair, change24h: 0 };
    });
  }, [prices, pairList]);

  const avgVol = (enrichedPairs.reduce((sum, p) => sum + p.volatility, 0) / enrichedPairs.length).toFixed(1);
  const totalVolume = enrichedPairs.reduce((sum, p) => sum + p.volume24h, 0);

  const usdInrPair = enrichedPairs.find(p => p.symbol === 'USDINR');
  const eurInrPair = enrichedPairs.find(p => p.symbol === 'EURINR');

  const volColor = (vol: number) =>
    vol < 5 ? 'var(--accent-green)' : vol < 7 ? 'var(--accent-gold)' : 'var(--accent-red)';

  const changeColor = (change: number) =>
    change > 0 ? 'var(--accent-green)' : change < 0 ? 'var(--accent-red)' : 'var(--text-muted)';

  return (
    <main className="page-bg">

      {/* Header */}
      <div className="page-header">
        <div className="content-wrapper">
          <div className="page-breadcrumb">
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI TERMINAL</Link>
            {' > '}
            <span>{t('forex.breadcrumb')}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, marginBottom: 28 }}>
            <div>
              <h1 className="philosophy-heading" style={{ fontSize: 36, color: 'var(--accent-gold)', letterSpacing: 2, marginBottom: 8, lineHeight: 1.1 }}>
                {t('forex.title')}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 480, lineHeight: 1.6 }}>
                {t('forex.subtitle')}
              </p>
              {lastUpdated && (
                <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: 8 }}>
                  ⚡ Live • Updated {lastUpdated.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }) + ' IST'}
                </div>
              )}
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: '16px 24px', minWidth: 160 }}>
              <div style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 8 }}>
                {t('forex.pairs')}
              </div>
              <div style={{ fontSize: 48, fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-gold)', lineHeight: 1 }}>
                {enrichedPairs.length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                {t('forex.inrCrossRates')}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {[
              { label: t('forex.avgVolatility'), value: avgVol + '%', color: 'var(--accent-gold)', bg: 'rgba(255,215,0,0.08)', border: 'rgba(255,215,0,0.2)' },
              { label: t('forex.volume24h'), value: '$' + (totalVolume / 1e9).toFixed(1) + 'B', color: 'var(--accent-green)', bg: 'rgba(0,186,124,0.08)', border: 'rgba(0,186,124,0.2)' },
              { 
                label: t('forex.usdInrSpot'), 
                value: usdInrPair ? usdInrPair.spotRate.toFixed(2) : '—',
                change: usdInrPair?.change24h,
                color: '#60a5fa', 
                bg: 'rgba(96,165,250,0.08)', 
                border: 'rgba(96,165,250,0.2)' 
              },
              { 
                label: t('forex.eurInrSpot'), 
                value: eurInrPair ? eurInrPair.spotRate.toFixed(2) : '—',
                change: eurInrPair?.change24h,
                color: '#c084fc', 
                bg: 'rgba(192,132,252,0.08)', 
                border: 'rgba(192,132,252,0.2)' 
              },
            ].map(stat => (
              <div
                key={stat.label}
                style={{
                  background: stat.bg,
                  border: '1px solid ' + stat.border,
                  borderRadius: 10,
                  padding: '12px 16px',
                }}
              >
                <div style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 4, letterSpacing: 1 }}>
                  {stat.label.toUpperCase()}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <div style={{ fontSize: 22, fontFamily: 'monospace', fontWeight: 700, color: stat.color }}>
                    {stat.value}
                  </div>
                  {stat.change !== undefined && (
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: changeColor(stat.change) }}>
                      {stat.change > 0 ? '+' : ''}{stat.change.toFixed(2)}%
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="content-wrapper" style={{ padding: '28px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            ⚡ Fetching live forex rates...
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="content-wrapper" style={{ padding: '28px 24px' }}>
          <div style={{ 
            background: 'rgba(239,68,68,0.1)', 
            border: '1px solid rgba(239,68,68,0.3)', 
            borderRadius: 8, 
            padding: 16, 
            fontSize: 12, 
            color: 'var(--accent-red)' 
          }}>
            ⚠️ {error}
          </div>
        </div>
      )}

      {/* Forex Table */}
      <div className="content-wrapper" style={{ padding: '28px 24px' }}>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 3, marginBottom: 16, fontFamily: 'monospace' }}>
          {t('forex.currencyPairs')}
        </div>

        <div className="card-sacred" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
                  {[
  { label: t('forex.pair') },
  { label: t('forex.spot') },
  { label: '24H CHANGE' },
  { label: t('forex.bid'), tip: 'Approx sell price' },
  { label: t('forex.ask'), tip: 'Approx buy price' },
  { label: t('forex.spread'), tip: 'Bid–Ask difference (transaction cost)' },
  { label: t('forex.forward1m'), tip: '1M forward (interest-diff estimate)' },
  { label: t('forex.volatility'), tip: 'Typical movement (risk proxy)' },
  { label: t('forex.ppp'), tip: 'PPP: fair value based on cost of goods' }
].map((h: any, i) => (
  <th key={h.label} style={{
    textAlign: i === 0 ? 'left' : 'right',
    padding: '14px 24px',
    fontSize: 9,
    fontFamily: 'monospace',
    color: 'var(--text-muted)',
    letterSpacing: 1,
    fontWeight: 600,
  }}>
    {h.label.toUpperCase()}{h.tip ? <InfoTooltip text={h.tip} /> : null}
  </th>
))}
                </tr>
              </thead>
              <tbody>
                {enrichedPairs.map(pair => (
                  <tr
                    key={pair.symbol}
                    style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background 0.15s' }}
                    onClick={() => router.push('/forex/' + pair.symbol)}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,215,0,0.03)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 16, marginBottom: 4 }}>
                        {pair.baseCurrency}/{pair.quoteCurrency}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pair.name}</div>
                    </td>
                    <td style={{ textAlign: 'right', padding: '16px 24px', fontWeight: 700, fontSize: 18, color: 'var(--accent-gold)', fontFamily: 'monospace' }}>
                      {pair.spotRate.toFixed(pair.baseCurrency === 'JPY' ? 4 : 2)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '16px 24px', fontFamily: 'monospace' }}>
                      <span style={{ 
                        color: changeColor(pair.change24h), 
                        fontSize: 13, 
                        fontWeight: 600 
                      }}>
                        {pair.change24h > 0 ? '+' : ''}{pair.change24h.toFixed(2)}%
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', padding: '16px 24px', color: 'var(--accent-green)', fontFamily: 'monospace' }}>
                      {pair.bid.toFixed(pair.baseCurrency === 'JPY' ? 4 : 2)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '16px 24px', color: 'var(--accent-red)', fontFamily: 'monospace' }}>
                      {pair.ask.toFixed(pair.baseCurrency === 'JPY' ? 4 : 2)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '16px 24px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 12 }}>
                      {((pair as any).spread || (pair.ask - pair.bid)).toFixed(4)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '16px 24px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      {((pair as any).forward1M || pair.forward3M).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '16px 24px' }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 6,
                        background: volColor(pair.volatility) + '20',
                        color: volColor(pair.volatility),
                        fontFamily: 'monospace',
                      }}>
                        {pair.volatility.toFixed(1)}%
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', padding: '16px 24px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      {pair.pppRate.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
