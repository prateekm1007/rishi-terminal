'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Stock } from '@/lib/types';
import { useLivePrices } from '@/hooks/useLivePrices';
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
}

export function PeerComparison({ stock, peers }: Props) {
  if (!stock || !peers) return null;

  const symbols = useMemo(
    () => [stock.symbol, ...peers.map(p => p.symbol)],
    [stock.symbol, peers]
  );

  const { prices } = useLivePrices(symbols);
  const { fundamentals: bulkFund } = useBulkFundamentals(symbols);

  const allStocks = [
    {
      symbol: stock.symbol,
      name: stock.name,
      price: prices[stock.symbol]?.price ?? stock.price,
      marketCap: bulkFund[stock.symbol]?.marketCap ? bulkFund[stock.symbol].marketCap / 10000000 : stock.mktcap,
      pe: bulkFund[stock.symbol]?.pe ?? stock.pe,
      roe: bulkFund[stock.symbol]?.roe ?? stock.roe,
      isCurrent: true,
    },
    ...peers.map(p => ({
      ...p,
      price: prices[p.symbol]?.price ?? p.price,
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
                  fontSize: 11, fontWeight: 700, color: '#64748B',
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
                    <div style={{ fontSize: 11, color: '#64748B' }}>{s.symbol}</div>
                  </Link>
                </td>
                <td style={{ padding: '10px 12px', color: '#F8FAFC', fontSize: 13, fontWeight: 500 }}>
                  {safeFixed(s.price)}
                </td>
                <td style={{ padding: '10px 12px', color: '#94A3B8', fontSize: 13 }}>
                  {s.marketCap > 0 ? `${safeFixed(s.marketCap / 1000)}K Cr` : 'N/A'}
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