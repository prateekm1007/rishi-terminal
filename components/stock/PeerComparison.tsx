'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useLivePrices } from '@/hooks/useLivePrices';
import { Stock } from '../../lib/types';

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

  const allStocks = [
    {
      symbol: stock.symbol,
      name: stock.name,
      price: stock.price,
      marketCap: stock.mktcap,
      pe: stock.pe,
      roe: stock.roe,
      isCurrent: true,
    },
    ...peers.map(p => ({ ...p, isCurrent: false })),
  ];

  const symbols = useMemo(
    () => [stock.symbol, ...peers.map(p => p.symbol)],
    [stock.symbol, peers]
  );

  const { prices: livePrices } = useLivePrices(symbols);

  const allStocksWithLivePrices = allStocks.map(s => ({
    ...s,
    price: livePrices[s.symbol]?.price ?? s.price,
  }));

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
                  padding: '10px 12px',
                  borderBottom: '1px solid rgba(51,65,85,0.5)',
                  textAlign: h === 'Company' ? 'left' as const : 'right' as const,
                  background: 'rgba(17,24,39,0.5)',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allStocksWithLivePrices.map((s, idx) => (
              <tr
                key={idx}
                style={{
                  background: s.isCurrent ? 'rgba(212,175,55,0.06)' : 'transparent',
                  borderLeft: s.isCurrent ? '3px solid #D4AF37' : '3px solid transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => {
                  if (!s.isCurrent) (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(31,41,59,0.5)';
                }}
                onMouseLeave={e => {
                  if (!s.isCurrent) (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                }}
              >
                <td style={{ padding: '12px', borderBottom: '1px solid rgba(30,41,59,0.5)' }}>
                  {s.isCurrent ? (
                    <div>
                      <div style={{ fontWeight: 700, color: '#D4AF37', fontSize: 13 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{s.symbol} · Current</div>
                    </div>
                  ) : (
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
                      <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{s.symbol} →</div>
                    </Link>
                  )}
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#F8FAFC', borderBottom: '1px solid rgba(30,41,59,0.5)' }}>
                  {safeFixed(s.price, 2)}
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#F8FAFC', borderBottom: '1px solid rgba(30,41,59,0.5)' }}>
                  {s.marketCap ? (s.marketCap / 1000).toFixed(0) + 'K Cr' : 'N/A'}
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#F8FAFC', borderBottom: '1px solid rgba(30,41,59,0.5)' }}>
                  {safeFixed(s.pe)}x
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, borderBottom: '1px solid rgba(30,41,59,0.5)',
                  color: Number(s.roe) >= 15 ? '#22C55E' : Number(s.roe) >= 10 ? '#D4AF37' : '#EF4444',
                }}>
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