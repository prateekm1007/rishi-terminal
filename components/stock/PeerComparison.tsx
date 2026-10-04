'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Stock } from '@/lib/types';
import { useLivePrices, type PriceData } from '@/hooks/useLivePrices';
import { useBulkFundamentals } from '@/hooks/useFundamentals';

interface PeerStock {
  symbol: string;
  name: string;
  price: number;
  marketCap: number;
  pe: number;
  roe: number;
}

interface Props {
  stock: Stock;
  peers: PeerStock[];
  /** Y2 (Round 12): the regen-time cache peek (mapped via
   *  dashboardSnapshot.toPriceData on the server) — peer prices ride
   *  the first byte with their own observation labels instead of "—".
   *  Missing symbols are simply absent: the honest "—" renders and the
   *  mount revalidation fills them (never a seed fallback). */
  initialPrices?: Record<string, PriceData>;
}

export function PeerComparison({ stock, peers, initialPrices }: Props) {
  // T18 fix: hooks were called after an early return — a real rules-of-hooks
  // bug. Compute with guarded defaults instead; the null render decision
  // happens at the end.
  const symbols = useMemo(
    () => [stock?.symbol, ...(peers ?? []).map(p => p.symbol)].filter(Boolean) as string[],
    [stock?.symbol, peers]
  );

  // Y2: hydrate from the SSR peek — the mount revalidation still runs
  // (useLivePrices revalidates on mount regardless of initialPrices).
  const { prices } = useLivePrices(symbols, 60000, initialPrices);
  const { fundamentals: bulkFund } = useBulkFundamentals(symbols);

  if (!stock || !peers) return null;

  const allStocks = [
    {
      symbol: stock.symbol,
      name: stock.name,
      // T14: no seed fallback — em dash rendered when the live feed is down
      price: prices[stock.symbol]?.price ?? null,
      // Y4 (Round 12): market caps are LIVE or blank. The old seed-mktcap
      // fallback rendered placeholder artifacts as data (AUBANK "300.0K
      // Cr"); /api/fundamentals' static fallback now nulls seed market
      // caps, so a miss stays a miss.
      marketCap: bulkFund[stock.symbol]?.marketCap ?? null,
      pe: bulkFund[stock.symbol]?.pe ?? stock.pe,
      roe: bulkFund[stock.symbol]?.roe ?? stock.roe,
      isCurrent: true,
    },
    ...peers.map(p => ({
      ...p,
      price: prices[p.symbol]?.price ?? null,
      marketCap: bulkFund[p.symbol]?.marketCap ?? null,
      isCurrent: false,
    })),
  ];

  const safeFixed = (v: any, d = 1) => {
    const n = Number(v);
    return isNaN(n) ? 'N/A' : n.toFixed(d);
  };

  return (
    <div style={{
      background: 'rgba(17,24,39,0.85)',
      border: '1px solid rgba(30,41,59,0.8)',
      borderRadius: 16,
      padding: 24,
    }}>
      <div style={{
        fontFamily: 'Cinzel, serif',
        fontWeight: 700,
        color: '#F8FAFC',
        fontSize: 18,
        marginBottom: 24,
      }}>
        Peer Comparison
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Company', 'Price', 'Market Cap', 'P/E', 'ROE'].map(h => (
                <th key={h} style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                  textTransform: 'uppercase' as const, letterSpacing: '0.08em',
                  padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid rgba(30,41,59,0.8)',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allStocks.map((s, idx) => (
              <tr
                key={idx}
                style={{
                  background: s.isCurrent ? 'rgba(212,175,55,0.06)' : 'transparent',
                  borderLeft: s.isCurrent ? '3px solid #D4AF37' : '3px solid transparent',
                }}
              >
                <td style={{ padding: '10px 12px' }}>
                  <Link href={`/stock/${s.symbol}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      fontWeight: 600, color: '#F8FAFC', fontSize: 13,
                      transition: 'color 0.15s',
                    }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.color = '#D4AF37'}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.color = '#F8FAFC'}
                    >
                      {s.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.symbol}</div>
                  </Link>
                </td>
                <td style={{ padding: '10px 12px', color: '#F8FAFC', fontSize: 13, fontWeight: 500 }}>
                  <span title={s.price == null ? "Live price unavailable \u2014 seed prices are never shown as current" : "Live price"}>
                    {s.price == null ? "\u2014" : safeFixed(s.price)}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', color: '#94A3B8', fontSize: 13 }}>
                  {s.marketCap != null && s.marketCap > 0 ? `${safeFixed(s.marketCap / 1000)}K Cr` : '—'}
                </td>
                <td style={{ padding: '10px 12px', color: '#94A3B8', fontSize: 13 }}>
                  {safeFixed(s.pe)}x
                </td>
                <td style={{ padding: '10px 12px', color: '#94A3B8', fontSize: 13 }}>
                  {safeFixed(s.roe)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}