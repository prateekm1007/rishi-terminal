'use client';

interface AnalystRec {
  firm: string;
  analyst: string;
  rating: 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL' | 'OUTPERFORM';
  targetPrice: number;
  upside: number;
  date: string;
}

interface Props {
  analystRecs: AnalystRec[];
  currentPrice: number;
}

const ratingStyle = (rating: string) => {
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    'BUY': { bg: 'bg-emerald-900/40', text: 'text-emerald-400', border: 'border-emerald-800' },
    'OUTPERFORM': { bg: 'bg-blue-900/40', text: 'text-blue-400', border: 'border-blue-800' },
    'HOLD': { bg: 'bg-amber-900/40', text: 'text-amber-400', border: 'border-amber-800' },
    'NEUTRAL': { bg: 'bg-zinc-800/40', text: 'text-zinc-400', border: 'border-zinc-700' },
    'SELL': { bg: 'bg-red-900/40', text: 'text-red-400', border: 'border-red-800' },
  };
  return styles[rating] || styles['NEUTRAL'];
};

export function AnalystRecommendations({ analystRecs, currentPrice }: Props) {
  const avgTarget = analystRecs.reduce((sum, r) => sum + r.targetPrice, 0) / analystRecs.length;
  const avgUpside = ((avgTarget - currentPrice) / currentPrice) * 100;
  
  const consensus = {
    buy: analystRecs.filter(r => r.rating === 'BUY' || r.rating === 'OUTPERFORM').length,
    hold: analystRecs.filter(r => r.rating === 'HOLD' || r.rating === 'NEUTRAL').length,
    sell: analystRecs.filter(r => r.rating === 'SELL').length,
  };

  return (
    <div className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="text-xs font-mono text-zinc-500">ANALYST RECOMMENDATIONS</div>
        <div className="text-xs font-mono text-emerald-500">{analystRecs.length} Analysts</div>
      </div>

      {/* Consensus Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-emerald-950/30 border border-emerald-800 p-4 rounded text-center">
          <div className="text-2xl font-mono font-bold text-emerald-400">{consensus.buy}</div>
          <div className="text-xs text-emerald-500 font-mono mt-1">BUY / OUTPERFORM</div>
        </div>
        <div className="bg-amber-950/30 border border-amber-800 p-4 rounded text-center">
          <div className="text-2xl font-mono font-bold text-amber-400">{consensus.hold}</div>
          <div className="text-xs text-amber-500 font-mono mt-1">HOLD / NEUTRAL</div>
        </div>
        <div className="bg-red-950/30 border border-red-800 p-4 rounded text-center">
          <div className="text-2xl font-mono font-bold text-red-400">{consensus.sell}</div>
          <div className="text-xs text-red-500 font-mono mt-1">SELL</div>
        </div>
      </div>

      {/* Average Target */}
      <div className="bg-zinc-950 p-4 rounded mb-6 border border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-zinc-500 font-mono">AVERAGE TARGET PRICE</div>
            <div className="text-2xl font-mono font-bold text-white mt-1">{avgTarget.toFixed(0)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-500 font-mono">POTENTIAL UPSIDE</div>
            <div className={`text-2xl font-mono font-bold mt-1 ${avgUpside >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {avgUpside >= 0 ? '+' : ''}{avgUpside.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Individual Recommendations */}
      <div className="space-y-3">
        {analystRecs.slice(0, 6).map((rec, i) => {
          const style = ratingStyle(rec.rating);
          return (
            <div key={i} className="flex items-center justify-between bg-zinc-950 p-4 rounded hover:bg-zinc-900 transition-colors border border-zinc-800">
              <div className="flex-1">
                <div className="font-semibold text-sm text-zinc-100">{rec.firm}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{rec.analyst} • {rec.date}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-mono font-bold text-lg">{rec.targetPrice.toLocaleString()}</div>
                  <div className={`text-xs font-mono ${rec.upside >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {rec.upside >= 0 ? '+' : ''}{rec.upside.toFixed(1)}%
                  </div>
                </div>
                <div className={`px-3 py-1.5 rounded border text-xs font-mono font-bold ${style.bg} ${style.text} ${style.border}`}>
                  {rec.rating}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}