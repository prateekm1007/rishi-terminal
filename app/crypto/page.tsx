'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CRYPTO_ASSETS, FEAR_GREED_INDEX, MARKET_DOMINANCE, getCryptoMetrics } from '../../data/crypto';
import { CRYPTO_GURUS } from '../../lib/gurus/crypto'; // R3: metadata only — verdicts come from /api/gurus
import { useTier } from '../../hooks/useTier';
import { UpgradePrompt } from '../../components/premium/UpgradePrompt';
import { useLanguage } from '../../lib/language';
import { useLivePrices } from '../../hooks/useLivePrices';
import { ProvenanceChip } from '../../components/shared/ProvenanceChip';


function scoreColor(score: number): string {
  if (score >= 75) return 'var(--accent-green)';
  if (score >= 55) return 'var(--accent-gold)';
  return 'var(--accent-red)';
}

export default function CryptoPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [sector, setSector] = useState('All');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { tier } = useTier();
  const premium = tier !== 'seeker';

  // R3 (round 2): guru verdicts are computed SERVER-SIDE (/api/gurus) and
  // tier-sliced there. This page renders only what it is served: a seeker
  // (or anonymous visitor) receives the free cards plus locked teasers
  // without insight/comps; the full verdicts exist only for premium tiers.
  const [guruVerdicts, setGuruVerdicts] = useState<Array<{
    id: string; name: string; score: number | null; label: string;
    locked: boolean; insight?: string; comps?: Array<{ label: string; v: number; wt: number; detail: string }>;
  }> | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/gurus?kind=crypto', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && Array.isArray(d?.gurus)) setGuruVerdicts(d.gurus); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Extract all crypto symbols
  const cryptoSymbols = useMemo(() => CRYPTO_ASSETS.map(c => c.symbol), []);
  
  // Fetch live prices
  const { prices, loading } = useLivePrices(cryptoSymbols, 60000);

  const sectors = ['All', ...Array.from(new Set(CRYPTO_ASSETS.map(c => c.sector)))];
  const filtered = sector === 'All' ? CRYPTO_ASSETS : CRYPTO_ASSETS.filter(c => c.sector === sector);

  // Update timestamp when prices change
  useEffect(() => {
    if (Object.keys(prices).length > 0) {
      setLastUpdated(new Date());
    }
  }, [prices]);

  // Audit 2026-10-02 (P1): Volume 24h sums the actual per-asset 24h
  // VOLUMES from the live transport (it previously summed PRICES divided
  // by 1e9 — the wrong metric). No live volume anywhere -> UNAVAILABLE.
  const liveVolumes = useMemo(() =>
    CRYPTO_ASSETS.map(a => prices[a.symbol]?.volume24h).filter(
      (v): v is number => typeof v === 'number' && v > 0,
    ), [prices]);
  const totalVolume24h = liveVolumes.length > 0 ? liveVolumes.reduce((s, v) => s + v, 0) : null;

  const fgValue = FEAR_GREED_INDEX.value;
  const fgColor = fgValue >= 60 ? 'var(--accent-green)' : fgValue >= 40 ? 'var(--accent-gold)' : 'var(--accent-red)';
  const fgLabel = fgValue >= 75 ? t('crypto.extremeGreed') : fgValue >= 55 ? t('crypto.greed') : fgValue >= 45 ? t('crypto.neutral') : fgValue >= 25 ? t('crypto.fear') : t('crypto.extremeFear');

  // Calculate metrics with live prices
  const totalMarketCap = useMemo(() => {
    let sum = 0;
    CRYPTO_ASSETS.forEach(asset => {
      const livePrice = prices[asset.symbol];
      if (livePrice) {
        sum += livePrice.price * (asset.marketCap / asset.price);
      }
    });
    return sum > 0 ? sum : CRYPTO_ASSETS.reduce((s, a) => s + a.marketCap, 0);
  }, [prices]);

  return (
    <main className="page-bg">

      {/* Header */}
      <div className="page-header">
        <div className="content-wrapper">
          <div className="page-breadcrumb">
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI TERMINAL</Link>
            {' > '}
            <span>{t('crypto.breadcrumb')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <h1 className="philosophy-heading" style={{ fontSize: 32, color: 'var(--accent-gold)', marginBottom: 8 }}>
                {t('crypto.title')}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 520, lineHeight: 1.6 }}>
                {t('crypto.subtitle')}
              </p>
            </div>
            {lastUpdated && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', textAlign: 'right' }}>
                <div style={{ color: '#00BA7C', fontWeight: 700 }}>● LIVE</div>
                <div>Updated {lastUpdated.toLocaleTimeString()}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="content-wrapper" style={{ padding: '28px 24px' }}>

        {/* Market Overview — every card carries its data-state chip (P1) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
          {[
            {
              label: t('crypto.totalMarketCap'),
              value: '$' + (totalMarketCap / 1e12).toFixed(2) + 'T', color: 'var(--accent-gold)',
              state: (Object.values(prices).length > 0 ? 'derived' : 'reference') as 'derived' | 'reference',
              title: Object.values(prices).length > 0
                ? 'Derived from live prices x reference market caps'
                : 'Static reference dataset — illustrative',
            },
            {
              label: t('crypto.volume24h'),
              value: totalVolume24h === null
                ? (loading ? '...' : '—')
                : '$' + (totalVolume24h / 1e9).toFixed(1) + 'B',
              color: 'var(--text-primary)',
              state: (totalVolume24h === null ? 'unavailable' : 'live') as 'unavailable' | 'live',
              title: totalVolume24h === null
                ? 'No live 24h volume disclosed by the upstream'
                : `Sum of live 24h volumes (${liveVolumes.length} of ${CRYPTO_ASSETS.length} assets)`,
            },
            {
              label: t('crypto.avgRsi'), value: '62', color: 'var(--accent-gold)',
              state: 'reference' as const,
              title: 'Static reference value — RSI is not computed from live data',
            },
            {
              label: t('crypto.sentiment'), value: 'BULLISH', color: 'var(--accent-green)',
              state: 'reference' as const,
              title: 'Static reference label — not derived from live data',
            },
            {
              label: t('crypto.btcDominance'), value: MARKET_DOMINANCE.btc + '%', color: 'var(--accent-gold)',
              state: 'reference' as const,
              title: 'Static reference dataset — illustrative',
            },
            {
              label: t('crypto.fearGreed'), value: fgValue.toString() + ' – ' + fgLabel, color: fgColor,
              state: 'reference' as const,
              title: 'Static reference value — the Fear & Greed index is not fetched live',
            },
          ].map(stat => (
            <div key={stat.label} className="card-sacred" style={{ padding: 16 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 1, display: 'flex', alignItems: 'center' }}>
                <span>{stat.label.toUpperCase()}</span>
                <ProvenanceChip state={stat.state} title={stat.title} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Fear & Greed Gauge — reference data (P1) */}
        <div className="card-sacred" style={{ padding: 24, marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 6, display: 'flex', alignItems: 'center' }}>
                <span>{t('crypto.fearGreedIndex')}</span>
                <ProvenanceChip state="reference" title="Static reference values — the Fear & Greed index is not fetched live" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'monospace', color: fgColor }}>
                {fgValue} – {fgLabel}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 24, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              <span>{t('crypto.yesterday')}: <strong style={{ color: 'var(--text-primary)' }}>{FEAR_GREED_INDEX.previousDay}</strong></span>
              <span>{t('crypto.lastWeek')}: <strong style={{ color: 'var(--text-primary)' }}>{FEAR_GREED_INDEX.previousWeek}</strong></span>
              <span>{t('crypto.lastMonth')}: <strong style={{ color: 'var(--text-primary)' }}>{FEAR_GREED_INDEX.previousMonth}</strong></span>
            </div>
          </div>
          <div style={{ position: 'relative', height: 20, background: 'linear-gradient(90deg, #F4212E 0%, #FFD700 50%, #00BA7C 100%)', borderRadius: 10 }}>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: 'calc(' + Math.min(95, Math.max(5, fgValue)) + '% - 12px)',
              transform: 'translateY(-50%)',
              width: 24, height: 24,
              background: 'var(--bg-primary)',
              border: '3px solid ' + fgColor,
              borderRadius: '50%',
              boxShadow: '0 0 12px ' + fgColor,
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
            <span>{t('crypto.extremeFear')} (0)</span>
            <span>{t('crypto.neutral')} (50)</span>
            <span>{t('crypto.extremeGreed')} (100)</span>
          </div>
        </div>

        {/* Crypto Assets Table */}
        <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 3, marginBottom: 16, fontFamily: 'monospace' }}>
          {t('crypto.allCryptoAssets')}
        </div>

        <div className="card-sacred" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
                  {['Asset', 'Price', 'Change 24h', 'Market Cap', 'Volume 24h'].map((h, i) => (
                    <th key={h} style={{
                      textAlign: i === 0 ? 'left' : 'right',
                      padding: '14px 24px',
                      fontSize: 9,
                      fontFamily: 'monospace',
                      color: 'var(--text-muted)',
                      letterSpacing: 1,
                      fontWeight: 600,
                    }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(asset => {
                  const liveData = prices[asset.symbol];
                  const displayPrice = liveData ? `$${liveData.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : '$...';
                  const displayChange = liveData ? `${liveData.change > 0 ? '+' : ''}${liveData.change.toFixed(2)}%` : '...';
                  
                  return (
                    <tr
                      key={asset.symbol}
                      role="link"
                      tabIndex={0}
                      aria-label={`${asset.name} (${asset.symbol}) — open details`}
                      onKeyDown={e => { if (e.key === 'Enter') router.push(`/crypto/${asset.symbol}`); }}
                      style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                      onClick={() => router.push(`/crypto/${asset.symbol}`)}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,215,0,0.03)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <td style={{ padding: '16px 24px', textAlign: 'left' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14, marginBottom: 4 }}>
                          {asset.emoji} {asset.symbol}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{asset.name}</div>
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', fontWeight: 700, fontSize: 16, color: 'var(--accent-gold)', fontFamily: 'monospace' }}>
                        {displayPrice}
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', fontSize: 14, fontFamily: 'monospace', fontWeight: 700, color: liveData && liveData.change > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        {displayChange}
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        ${(asset.marketCap / 1e9).toFixed(1)}B
                        <ProvenanceChip state="reference" title="Static reference market cap" />
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        {liveData && typeof liveData.volume24h === 'number' && liveData.volume24h > 0
                          ? <>${(liveData.volume24h / 1e9).toFixed(1)}B <ProvenanceChip state="live" /></>
                          : <>${(asset.volume24h / 1e9).toFixed(1)}B <ProvenanceChip state="reference" title="Static reference volume — no live 24h volume disclosed" /></>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Crypto Rishis */}
        <div style={{ marginTop: 40, marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 3, marginBottom: 16, fontFamily: 'monospace' }}>
            {t('crypto.cryptoPhilosophers')}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(guruVerdicts ?? []).map(verdict => {
            const guru = CRYPTO_GURUS.find(g => g.id === verdict.id);
            if (!guru) return null;
            const isExpanded = expandedCard === guru.id;

            if (verdict.locked) {
              // R3: locked teaser — only the score is served for locked
              // gurus; insight/comps never reached the browser.
              return (
                <div key={guru.id} className="card-sacred" style={{ padding: 24, opacity: 0.6 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Unlock {guru.name} (Score {verdict.score ?? '—'}) with Student tier
                    </div>
                  </div>
                </div>
              );
            }
            const result = {
              score: verdict.score,
              label: verdict.label,
              insight: verdict.insight ?? '',
              comps: verdict.comps ?? [],
            };

            return (
              <div
                key={guru.id}
                className="card-sacred"
                style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => setExpandedCard(isExpanded ? null : guru.id)}
              >
                <div style={{ height: 3, background: 'linear-gradient(90deg, var(--accent-gold), #A78BFA)' }} />
                <div style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: 'rgba(255,215,0,0.1)',
                        border: '1px solid rgba(255,215,0,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
                        color: 'var(--accent-gold)',
                      }}>
                        {guru.tag}
                      </div>
                      <div>
                        <div className="philosophy-heading" style={{ fontSize: 18, color: 'var(--text-primary)', marginBottom: 4 }}>
                          {guru.name}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {guru.bio}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 48, fontWeight: 900, fontFamily: 'monospace', color: result.score === null ? '#64748B' : scoreColor(result.score), lineHeight: 1 }}>
                        {result.score === null ? '\u2014' : result.score}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                        {result.label}
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div style={{ paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 16 }}>
                        {result.insight}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
                        {result.comps.map((c, i) => (
                          <div key={i} style={{
                            background: 'var(--bg-secondary)',
                            padding: 12,
                            borderRadius: 6,
                            textAlign: 'center',
                          }}>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 4 }}>
                              {c.label}
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: scoreColor(c.v) }}>
                              {c.v}
                            </div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                              {c.wt}% weight
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {showUpgrade && <UpgradePrompt reason="limit_reached" onClose={() => setShowUpgrade(false)} />}
      </div>
    </main>
  );
}
