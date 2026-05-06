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
    <div className="card-sacred p-6">
      <div className="philosophy-heading text-lg mb-6">Peer Comparison</div>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th className="text-right">Price</th>
              <th className="text-right">Market Cap</th>
              <th className="text-right">P/E</th>
              <th className="text-right">ROE</th>
            </tr>
          </thead>
          <tbody>
            {allStocks.map((s, idx) => (
              <tr
                key={idx}
                className={s.isCurrent ? 'bg-accent-gold/10' : ''}
              >
                <td>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-muted">{s.symbol}</div>
                </td>
                <td className="text-right font-mono">{s.price.toFixed(2)}</td>
                <td className="text-right font-mono">{(s.marketCap / 1000).toFixed(0)}K Cr</td>
                <td className="text-right font-mono">{s.pe.toFixed(1)}</td>
                <td className="text-right font-mono">{s.roe.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}