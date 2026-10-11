'use client';

// FD-15 (founder decision 2026-10-11): "Keep them, with each row showing
// its source and as-of time." This page renders market values ONLY through
// the sourced-rows contract (lib/markets/sourcedRow + MarketRowCells):
// every value cell carries value, unit, source, as-of time and state; a
// value with no source and no date renders "—" with "no source yet".
// The seed numeric fields in data/crypto.ts (reference market caps, the
// Fear & Greed index, BTC dominance) NEVER render as data here — the
// acceptance scanner (test/refMarkets.sourced.test.ts) fails the build if
// they come back.

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CRYPTO_ASSETS } from '../../data/crypto';
import { CRYPTO_GURUS } from '../../lib/gurus/crypto'; // R3: metadata only — verdicts come from /api/gurus
import { useLanguage } from '../../lib/language';
import { useLivePrices } from '../../hooks/useLivePrices';
import {
  wireEntryToRow,
  wireCapToRow,
  wireVolumeToRow,
  wireChangeValue,
  cryptoSnapshotTotals,
  observedCountOf,
  wireVolumeSum,
  type MarketRow,
} from '../../lib/markets/sourcedRow';
import {
  MarketValueCell,
  MarketSourceCell,
  MarketAsOfCell,
  MarketStateChip,
  formatMarketChange,
} from '../../components/shared/MarketRowCells';

/** The display name of the crypto price source (provider matrix:
 *  CoinGecko, credited on every surface that shows its values). */
const CRYPTO_SOURCE_NAME = 'CoinGecko';

function scoreColor(score: number): string {
  if (score >= 75) return 'var(--accent-green)';
  if (score >= 55) return 'var(--accent-gold)';
  return 'var(--accent-red)';
}

export default function CryptoPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [sector, setSector] = useState('All');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // R3 (round 2) + Commit M3 (free access): guru verdicts are computed
  // SERVER-SIDE (/api/gurus) and served in full to every caller. This page
  // renders only what it is served. (FD-12 keeps them labelled heuristic
  // reference — a separate, still-open founder decision.)
  const [guruVerdicts, setGuruVerdicts] = useState<Array<{
    id: string; name: string; score: number | null; label: string;
    insight?: string; comps?: Array<{ label: string; v: number; wt: number; detail: string }>;
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

  // Fetch live prices. G4 (founder round 23): observedAt is the
  // server-disclosed OBSERVATION clock — the header below keys off it,
  // never off a fetch/arrival time, and the LIVE word is earned by
  // actual observations (a fetch is not a freshness claim).
  const { prices, loading: pricesLoading, observedAt } = useLivePrices(cryptoSymbols, 60000);
  // FD-15: LIVE is earned by COMPLETE observations (price + source +
  // observation time) — not by a mere price field.
  const observedCount = useMemo(
    () => observedCountOf(prices, cryptoSymbols),
    [prices, cryptoSymbols],
  );

  const sectors = ['All', ...Array.from(new Set(CRYPTO_ASSETS.map(c => c.sector)))];
  const filtered = sector === 'All' ? CRYPTO_ASSETS : CRYPTO_ASSETS.filter(c => c.sector === sector);

  // FD-15 (founder order 2026-10-11, item 4): "Show BTC dominance only
  // from the same snapshot as the market cap." Totals and dominance derive
  // from the CoinGecko payload's OWN market caps — never a live price
  // times a seed cap (that mixes snapshots). Incomplete disclosure →
  // null → "—" (an incomplete denominator is not a dominance claim).
  const snapshot = useMemo(
    () => cryptoSnapshotTotals(prices, cryptoSymbols),
    [prices, cryptoSymbols],
  );

  // FD-15: the 24h volume total sums the SAME disclosed live volumes
  // (complete observations only); its as-of is the newest observation
  // time among the contributing entries.
  const volumeTotal = useMemo(
    () => wireVolumeSum(prices, cryptoSymbols),
    [prices, cryptoSymbols],
  );
  const volumeAsOf = useMemo(() => {
    let newest: string | null = null;
    for (const sym of cryptoSymbols) {
      const at = prices[sym]?.lastUpdated;
      if (typeof at === 'string' && at && (newest === null || at > newest)) newest = at;
    }
    return newest;
  }, [prices, cryptoSymbols]);

  /** A contract row for the header stat cards. */
  function headerRow(value: number | null, source: string | null, asOf: string | null): MarketRow {
    return {
      value,
      unit: '',
      source,
      asOf,
      state: value === null ? 'missing' : 'live',
    };
  }

  const totalCapRow = headerRow(snapshot ? snapshot.totalMarketCap : null, snapshot ? CRYPTO_SOURCE_NAME : null, snapshot ? snapshot.snapshotAt : null);
  const dominanceRow = headerRow(snapshot ? snapshot.btcShare : null, snapshot ? CRYPTO_SOURCE_NAME : null, snapshot ? snapshot.snapshotAt : null);
  const volumeRow = headerRow(volumeTotal, volumeTotal === null ? null : CRYPTO_SOURCE_NAME, volumeTotal === null ? null : volumeAsOf);
  const noSourceRow: MarketRow = { value: null, unit: '', source: null, asOf: null, state: 'missing' };

  // The stat cards every FD-15 surface shows: value, source, as-of, state.
  // Unsourced analytics (RSI, sentiment, Fear & Greed) render "—" with
  // "no source yet" — they were previously seed numbers shown as data.
  const statCards: Array<{ label: string; row: MarketRow; compact?: boolean; unit?: string; title?: string }> = [
    {
      label: t('crypto.totalMarketCap'),
      row: totalCapRow, compact: true,
      title: 'Sum of the market caps disclosed in the SAME CoinGecko snapshot as the prices (never a live price times a reference cap)',
    },
    {
      label: t('crypto.volume24h'),
      row: volumeRow, compact: true,
      title: 'Sum of the live 24h volumes the upstream disclosed',
    },
    {
      label: t('crypto.btcDominance'),
      row: dominanceRow, unit: '%',
      title: 'BTC share of the same-snapshot market-cap total',
    },
    {
      label: t('crypto.avgRsi'), row: noSourceRow,
      title: 'No RSI source is wired — nothing renders until one is',
    },
    {
      label: t('crypto.sentiment'), row: noSourceRow,
      title: 'No sentiment source is wired — nothing renders until one is',
    },
    {
      label: t('crypto.fearGreed'), row: noSourceRow,
      title: 'No Fear & Greed source is wired — the old gauge showed a static reference value as data',
    },
  ];

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
            {observedCount > 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', textAlign: 'right' }}>
                <div style={{ color: '#00BA7C', fontWeight: 700 }}>● {observedCount === CRYPTO_ASSETS.length ? 'LIVE' : `LIVE ${observedCount}/${CRYPTO_ASSETS.length}`}</div>
                {observedAt ? <div>Observed {observedAt.toLocaleTimeString('en-IN')}</div> : <div>Observation time not disclosed</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="content-wrapper" style={{ padding: '28px 24px' }}>

        {/* Market Overview — every card is an FD-15 contract row: value,
            unit, source, as-of time and state. Unsourced cards show "—"
            with "no source yet". Data by CoinGecko (provider matrix). */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12, marginBottom: 28 }}>
          {statCards.map(stat => (
            <div key={stat.label} className="card-sacred" style={{ padding: 16 }} title={stat.title}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{stat.label.toUpperCase()}</span>
                <MarketStateChip row={stat.row} />
              </div>
              <div style={{ fontSize: 16, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <MarketValueCell row={stat.unit ? { ...stat.row, unit: stat.unit } : stat.row} compact={stat.compact} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginTop: 6 }}>
                <MarketSourceCell row={stat.row} />
                <MarketAsOfCell row={stat.row} />
              </div>
            </div>
          ))}
        </div>

        {/* Crypto Assets Table — the FD-15 contract columns */}
        <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 3, marginBottom: 16, fontFamily: 'monospace' }}>
          {t('crypto.allCryptoAssets')}
        </div>

        <div className="card-sacred" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
                  {['Asset', 'Price', 'Change 24h', 'Market Cap', 'Volume 24h', 'Source', 'As Of'].map((h, i) => (
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
                  const entry = prices[asset.symbol];
                  // FD-15: every value on this table renders through the
                  // wire→row mappers — price, change, market cap and volume
                  // each carry their source and observation time, or "—".
                  const priceRow = wireEntryToRow(entry, { unit: '$', sourceName: CRYPTO_SOURCE_NAME });
                  const capRow = wireCapToRow(entry, { unit: '', sourceName: CRYPTO_SOURCE_NAME });
                  const volRow = wireVolumeToRow(entry, { unit: '', sourceName: CRYPTO_SOURCE_NAME });
                  const change = wireChangeValue(entry);
                  const stillLoading = !entry && pricesLoading;

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
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                          {asset.emoji} {asset.symbol}
                          <MarketStateChip row={priceRow} />
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{asset.name}</div>
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', fontSize: 16, fontFamily: 'monospace' }}>
                        {stillLoading ? <span style={{ color: 'var(--text-muted)' }}>…</span> : <MarketValueCell row={priceRow} />}
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', fontSize: 14, fontFamily: 'monospace', fontWeight: 700, color: change === null ? 'var(--text-muted)' : change > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        {change === null ? '—' : formatMarketChange(change)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', fontFamily: 'monospace' }}>
                        <MarketValueCell row={capRow} compact muted />
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', fontFamily: 'monospace' }}>
                        <MarketValueCell row={volRow} compact muted />
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px' }}>
                        <MarketSourceCell row={priceRow} />
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px' }}>
                        <MarketAsOfCell row={priceRow} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Crypto Rishis — FD-12 heuristic-reference verdicts from the
            server; they are score surfaces, not market values, and stay
            labelled by /api/gurus. */}
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
                      <div style={{ fontSize: 48, fontWeight: 900, fontFamily: 'monospace', color: result.score === null ? 'var(--text-muted)' : scoreColor(result.score), lineHeight: 1 }}>
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

      </div>
    </main>
  );
}
