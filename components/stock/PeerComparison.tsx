'use client';

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

  return (
    <div style={{
      background: 'rgba(17,24,39,0.85)',
      border: '1px solid rgba(30,41,59,0.8)',
      borderRadius: 16,
      padding: 24,
    }}>
      <div style={{
        fontFamily: 'Cinzel, Playfair Display, Georgia, serif',
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
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  padding: '10px 12px',
                  borderBottom: '1px solid rgba(51,65,85,0.5)',
                  textAlign: h === 'Company' ? 'left' : 'right',
                  background: 'rgba(17,24,39,0.5)',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allStocks.map((s, idx) => (
              <tr key={idx} style={{
                background: s.isCurrent ? 'rgba(212,175,55,0.06)' : 'transparent',
                borderLeft: s.isCurrent ? '3px solid #D4AF37' : '3px solid transparent',
              }}>
                <td style={{ padding: '12px', borderBottom: '1px solid rgba(30,41,59,0.5)' }}>
                  <div style={{ fontWeight: 600, color: s.isCurrent ? '#D4AF37' : '#F8FAFC', fontSize: 13 }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{s.symbol}</div>
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#F8FAFC', borderBottom: '1px solid rgba(30,41,59,0.5)' }}>
                  {s.price.toFixed(2)}
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#F8FAFC', borderBottom: '1px solid rgba(30,41,59,0.5)' }}>
                  {(s.marketCap / 1000).toFixed(0)}K Cr
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#F8FAFC', borderBottom: '1px solid rgba(30,41,59,0.5)' }}>
                  {s.pe.toFixed(1)}x
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, borderBottom: '1px solid rgba(30,41,59,0.5)',
                  color: s.roe >= 15 ? '#22C55E' : s.roe >= 10 ? '#D4AF37' : '#EF4444',
                }}>
                  {s.roe.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}