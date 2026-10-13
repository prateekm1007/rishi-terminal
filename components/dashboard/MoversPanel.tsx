import 'server-only';

import Link from 'next/link';
import type { MoversSnapshot, MoverRow } from '@/lib/movers/types';
import { moverRowFace, moversDerivationLine, moversListDerivationLine } from '@/lib/movers/presentation';

/**
 * LIVE-TODAY (founder order, 2026-10-13): the dashboard's Top Winners /
 * Top Losers panels — "add top 5 losers and top 5 winner stocks on
 * dashboard", powered by the unofficial data scrapers' transports
 * (NSE's own live-analysis endpoint first; the shared Yahoo-fed quote
 * cache as the always-available computation — lib/movers/warm.ts).
 *
 * SERVER component — zero first-load JS (the C9 pairing, same class as
 * the TodayPanel it renders inside). The snapshot arrives as a prop
 * from the homepage's ISR regeneration (ONE cheap read of
 * market_movers, never a vendor fetch in the render path — the Y1
 * contract), so a null snapshot renders the honest not-generated state,
 * never a fabricated list.
 *
 * Honesty contract:
 *   - every row carries "Source · IST stamp" or "no source yet" (the
 *     FD-15 wording, derived by the ONE face owner in
 *     lib/movers/presentation);
 *   - the derivation line says HOW the list was produced (NSE endpoint
 *     vs computed from cached observations) and, for the computed path,
 *     how many tracked symbols were observed this session;
 *   - the unofficial-data caveat is rendered on the panel — movers are
 *     raw market display, not advice (the P0-8 price-SCORE gate in
 *     lib/licensing.ts is untouched: nothing here computes a score).
 */

const GOLD = 'var(--accent-gold, #D4AF37)';
const GREEN = '#22C55E';
const RED = '#EF4444';

function MoversList({ rows, kind }: { rows: MoverRow[]; kind: 'gainer' | 'loser' | 'mover' }) {
  const accent = kind === 'gainer' ? GREEN : kind === 'mover' ? GOLD : RED;
  const title =
    kind === 'gainer' ? "Today's Top 5 Winners" : kind === 'mover' ? "Today's Top 5 Movers" : "Today's Top 5 Losers";
  return (
    <div
      data-movers-kind={kind}
      style={{
        flex: '1 1 300px',
        minWidth: 260,
        border: `1px solid ${kind === 'gainer' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
        borderRadius: 12,
        padding: '14px 16px',
        background: 'rgba(15,23,42,0.45)',
      }}
    >
      <h3 style={{ fontSize: 14, fontWeight: 700, color: accent, margin: '0 0 10px', letterSpacing: '0.02em' }}>
        {title}
      </h3>
      {rows.length === 0 ? (
        <div data-movers-empty style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          No {kind === 'gainer' ? 'winners' : kind === 'mover' ? 'movers to list' : 'losers'} yet — nothing is shown rather than estimated.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {rows.map((row) => {
            const face = moverRowFace(row);
            const symEl = face.href ? (
              <Link
                href={face.href}
                data-movers-symbol={face.symbol}
                style={{ color: GOLD, textDecoration: 'none', fontWeight: 600, fontSize: 13 }}
              >
                {face.symbol}
              </Link>
            ) : (
              <span data-movers-symbol={face.symbol} style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)' }}>
                {face.symbol}
              </span>
            );
            return (
              <div
                key={`${kind}-${row.rank}`}
                data-movers-row
                data-movers-source={row.source ?? ''}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '18px 1fr auto',
                  columnGap: 8,
                  alignItems: 'baseline',
                  fontSize: 12.5,
                  lineHeight: 1.55,
                }}
              >
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{row.rank}</span>
                <span>
                  {symEl}
                  {face.name ? (
                    <span style={{ color: 'var(--text-muted)' }}> — {face.name}</span>
                  ) : null}
                  <span
                    data-movers-attribution
                    style={{ display: 'block', fontSize: 10.5, color: 'var(--text-muted)' }}
                  >
                    {face.attribution}
                  </span>
                </span>
                <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <span style={{ color: 'var(--text-secondary)', display: 'block' }}>{face.priceText}</span>
                  <span
                    style={{
                      color:
                        face.positive === null
                          ? 'var(--text-muted)'
                          : face.positive
                            ? GREEN
                            : RED,
                      display: 'block',
                      fontSize: 11.5,
                    }}
                  >
                    {face.changeText}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function MoversPanel({ movers }: { movers: MoversSnapshot | null }) {
  return (
    <section data-movers-panel aria-label="Top movers" style={{ marginTop: 14 }}>
      {movers === null ? (
        <div
          data-movers-notgenerated
          style={{
            border: '1px dashed rgba(100,116,139,0.4)',
            borderRadius: 12,
            padding: '14px 16px',
            fontSize: 12.5,
            color: 'var(--text-muted)',
            lineHeight: 1.7,
          }}
        >
          Top winners and losers: no data yet — the list is generated from live unofficial sources within a
          minute of the next market session (or a forced verification run). Nothing is estimated in the meantime.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <MoversList rows={movers.gainers} kind="gainer" />
            <MoversList rows={movers.losers} kind="loser" />
            <MoversList rows={movers.movers} kind="mover" />
          </div>
          <div style={{ marginTop: 8, fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <span data-movers-derivation>{moversDerivationLine(movers.derivation, movers.universeObserved)}</span>{' '}
            {moversListDerivationLine(movers.moversUniverseObserved)}{' '}
            Unofficial market data — may be delayed, incomplete, or wrong. Not investment advice.
          </div>
        </>
      )}
    </section>
  );
}
