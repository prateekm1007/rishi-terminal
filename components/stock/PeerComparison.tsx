'use client';
import Link from 'next/link';

interface PeerStock {
  symbol: string;
  name: string;
  price: number;
  marketCap: number;
  pe: number;
  pb?: number;
  roe: number;
  roce: number;
  debtEquity: number;
  revenueGrowth: number;
  netProfitMargin: number;
}

interface Props {
  peers: PeerStock[];
  currentStock: any;
}

const metricColor = (value: number, metric: string) => {
  if (metric === 'pe') return value < 25 ? '#10b981' : value < 40 ? '#f59e0b' : '#ef4444';
  if (metric === 'roe' || metric === 'roce') return value >= 20 ? '#10b981' : value >= 15 ? '#f59e0b' : '#71717a';
  if (metric === 'de') return value < 0.5 ? '#10b981' : value < 1 ? '#f59e0b' : '#ef4444';
  if (metric === 'growth') return value >= 15 ? '#10b981' : value >= 10 ? '#f59e0b' : '#71717a';
  return '#71717a';
};

export function PeerComparison({ peers, currentStock }: Props) {
  const allStocks = [
    {
      symbol: currentStock.symbol,
      name: currentStock.name,
      price: currentStock.price,
      marketCap: currentStock.mktcap,
      pe: currentStock.pe,
      pb: 0,
      roe: currentStock.roe,
      roce: currentStock.roce,
      debtEquity: currentStock.de,
      revenueGrowth: currentStock.revcagr,
      netProfitMargin: currentStock.opm,
    },
    ...peers,
  ];

  return (
    <div className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="text-xs font-mono text-zinc-500">PEER COMPARISON — {currentStock.sector}</div>
        <div className="text-xs font-mono text-emerald-500">{peers.length + 1} Companies</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left py-3 font-mono text-xs text-zinc-500 sticky left-0 bg-zinc-900/40">COMPANY</th>
              <th className="text-right py-3 font-mono text-xs text-zinc-500">PRICE</th>
              <th className="text-right py-3 font-mono text-xs text-zinc-500">MKT CAP</th>
              <th className="text-right py-3 font-mono text-xs text-zinc-500">P/E</th>
              <th className="text-right py-3 font-mono text-xs text-zinc-500">ROE %</th>
              <th className="text-right py-3 font-mono text-xs text-zinc-500">ROCE %</th>
              <th className="text-right py-3 font-mono text-xs text-zinc-500">D/E</th>
              <th className="text-right py-3 font-mono text-xs text-zinc-500">REV GROWTH</th>
              <th className="text-right py-3 font-mono text-xs text-zinc-500">NPM %</th>
            </tr>
          </thead>
          <tbody>
            {allStocks.map((peer, i) => {
              const isCurrent = i === 0;
              return (
                <tr 
                  key={peer.symbol} 
                  className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/30 transition-colors"
                  style={{ background: isCurrent ? '#10b98110' : 'transparent' }}
                >
                  <td className="py-3 sticky left-0 bg-zinc-900/40">
                    <Link href={`/stock/${peer.symbol}`} className="hover:text-amber-400 transition-colors">
                      <div className="font-semibold" style={{ color: isCurrent ? '#10b981' : '#e4e4e7' }}>
                        {peer.name}
                        {isCurrent && <span className="ml-2 text-xs text-emerald-500">(You)</span>}
                      </div>
                      <div className="text-xs text-zinc-500">{peer.symbol}</div>
                    </Link>
                  </td>
                  <td className="py-3 text-right font-mono">{peer.price.toLocaleString()}</td>
                  <td className="py-3 text-right font-mono text-zinc-400">
                    {peer.marketCap >= 100000 ? `${(peer.marketCap / 100000).toFixed(1)}L Cr` : `${(peer.marketCap / 1000).toFixed(1)}K Cr`}
                  </td>
                  <td className="py-3 text-right font-mono font-bold" style={{ color: metricColor(peer.pe, 'pe') }}>
                    {peer.pe > 0 ? peer.pe.toFixed(1) : '—'}
                  </td>
                  <td className="py-3 text-right font-mono font-bold" style={{ color: metricColor(peer.roe, 'roe') }}>
                    {peer.roe}%
                  </td>
                  <td className="py-3 text-right font-mono font-bold" style={{ color: metricColor(peer.roce, 'roce') }}>
                    {peer.roce}%
                  </td>
                  <td className="py-3 text-right font-mono font-bold" style={{ color: metricColor(peer.debtEquity, 'de') }}>
                    {peer.debtEquity.toFixed(2)}
                  </td>
                  <td className="py-3 text-right font-mono font-bold" style={{ color: metricColor(peer.revenueGrowth, 'growth') }}>
                    {peer.revenueGrowth}%
                  </td>
                  <td className="py-3 text-right font-mono" style={{ color: metricColor(peer.netProfitMargin, 'growth') }}>
                    {peer.netProfitMargin}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Highest ROE', value: Math.max(...allStocks.map(s => s.roe)), suffix: '%' },
          { label: 'Lowest P/E', value: Math.min(...allStocks.filter(s => s.pe > 0).map(s => s.pe)), suffix: '' },
          { label: 'Best Growth', value: Math.max(...allStocks.map(s => s.revenueGrowth)), suffix: '%' },
          { label: 'Least Debt', value: Math.min(...allStocks.map(s => s.debtEquity)), suffix: 'x' },
        ].map(stat => (
          <div key={stat.label} className="bg-zinc-950 p-3 rounded border border-zinc-800">
            <div className="text-xs text-zinc-500 font-mono">{stat.label}</div>
            <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
              {stat.value.toFixed(1)}{stat.suffix}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}