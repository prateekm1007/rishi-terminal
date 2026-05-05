'use client';

interface TechnicalIndicator {
  name: string;
  value: string;
  signal: string;
  timeframe: string;
}

interface Props {
  technicals: TechnicalIndicator[];
}

const signalColor = (signal: string) => {
  if (signal === 'BUY') return { bg: 'bg-emerald-900/40', text: 'text-emerald-400', border: 'border-emerald-800' };
  if (signal === 'SELL') return { bg: 'bg-red-900/40', text: 'text-red-400', border: 'border-red-800' };
  return { bg: 'bg-amber-900/40', text: 'text-amber-400', border: 'border-amber-800' };
};

export function TechnicalIndicators({ technicals }: Props) {
  const pivots = [
    { level: 'R2', value: 3420, type: 'resistance' },
    { level: 'R1', value: 3310, type: 'resistance' },
    { level: 'PP', value: 3250, type: 'pivot' },
    { level: 'S1', value: 3180, type: 'support' },
    { level: 'S2', value: 3095, type: 'support' },
  ];

  const movingAvgs = [
    { period: 'SMA 20', value: 3215, signal: 'BUY', vsPrice: '+1.1%' },
    { period: 'SMA 50', value: 3180, signal: 'BUY', vsPrice: '+2.2%' },
    { period: 'SMA 200', value: 3050, signal: 'BUY', vsPrice: '+6.6%' },
    { period: 'EMA 20', value: 3235, signal: 'NEUTRAL', vsPrice: '+0.5%' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Main Indicators */}
      <div className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-6">
        <div className="text-xs font-mono text-zinc-500 mb-6 flex items-center justify-between">
          <span>TECHNICAL INDICATORS</span>
          <span className="text-emerald-500">8/10 Bullish</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {technicals.map((tech, i) => {
            const colors = signalColor(tech.signal);
            return (
              <div key={i} className="bg-zinc-950 p-4 rounded border border-zinc-800">
                <div className="text-xs text-zinc-500 font-mono mb-1">{tech.name}</div>
                <div className="text-lg font-mono font-bold">{tech.value}</div>
                <div className={`text-xs mt-2 inline-block px-2 py-1 rounded border ${colors.bg} ${colors.text} ${colors.border}`}>
                  {tech.signal}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Moving Averages Table */}
      <div className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-6">
        <div className="text-xs font-mono text-zinc-500 mb-4">MOVING AVERAGES</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left py-2 font-mono text-xs text-zinc-500">PERIOD</th>
              <th className="text-right py-2 font-mono text-xs text-zinc-500">VALUE</th>
              <th className="text-right py-2 font-mono text-xs text-zinc-500">VS PRICE</th>
              <th className="text-center py-2 font-mono text-xs text-zinc-500">SIGNAL</th>
            </tr>
          </thead>
          <tbody>
            {movingAvgs.map((ma, i) => {
              const colors = signalColor(ma.signal);
              return (
                <tr key={i} className="border-b border-zinc-800 last:border-0">
                  <td className="py-3 font-mono text-zinc-300">{ma.period}</td>
                  <td className="py-3 text-right font-mono">{ma.value}</td>
                  <td className="py-3 text-right font-mono text-emerald-400">{ma.vsPrice}</td>
                  <td className="py-3 text-center">
                    <span className={`text-xs px-3 py-1 rounded border ${colors.bg} ${colors.text} ${colors.border}`}>
                      {ma.signal}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pivot Points */}
      <div className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-6">
        <div className="text-xs font-mono text-zinc-500 mb-4">PIVOT POINTS (Standard)</div>
        <div className="space-y-2">
          {pivots.map((p, i) => (
            <div key={i} className="flex items-center justify-between bg-zinc-950 p-3 rounded">
              <span className={`text-xs font-mono font-bold ${
                p.type === 'resistance' ? 'text-red-400' : 
                p.type === 'support' ? 'text-emerald-400' : 
                'text-amber-400'
              }`}>
                {p.level}
              </span>
              <span className="font-mono text-sm">{p.value.toLocaleString()}</span>
              <span className="text-xs text-zinc-500 font-mono uppercase">{p.type}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}