'use client';

import { MetricCard, StatGroup } from './StyleGuide';

interface AnalystRec {
  firm: string;
  rating: string;
  targetPrice: number;
  date: string;
}

interface Props {
  recommendations: AnalystRec[];
  currentPrice: number;
}

export function AnalystRecommendations({ recommendations, currentPrice }: Props) {
  if (!recommendations || recommendations.length === 0 || !currentPrice) {
    return null;
  }

  const avgTarget =
    recommendations.reduce((sum, r) => sum + r.targetPrice, 0) / recommendations.length;
  const avgUpside = ((avgTarget - currentPrice) / currentPrice) * 100;

  const consensus = {
    buy: recommendations.filter(r => r.rating === 'Buy').length,
    hold: recommendations.filter(r => r.rating === 'Hold').length,
    sell: recommendations.filter(r => r.rating === 'Sell').length,
  };

  return (
    <div className="card-sacred p-6">
      <div className="philosophy-heading text-lg mb-6">Analyst Recommendations</div>

      {/* Consensus */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <MetricCard label="Buy" value={consensus.buy} color="green" />
        <MetricCard label="Hold" value={consensus.hold} color="yellow" />
        <MetricCard label="Sell" value={consensus.sell} color="red" />
      </div>

      {/* Target Price */}
      <div className="p-6 bg-secondary/50 rounded-lg border border-border-primary/50 mb-6">
        <div className="philosophy-subheading text-xs mb-4">CONSENSUS TARGET</div>
        <div className="flex justify-between items-end">
          <div>
            <div className="text-xs text-muted mb-1">Avg Target Price</div>
            <div className="text-3xl font-bold font-mono text-accent-gold">{avgTarget.toFixed(2)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted mb-1">Upside Potential</div>
            <div className={`text-2xl font-bold font-mono ${avgUpside >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {avgUpside >= 0 ? '+' : ''}{avgUpside.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Recent Calls */}
      <div>
        <div className="philosophy-subheading text-xs mb-4">RECENT CALLS</div>
        <div className="space-y-2">
          {recommendations.slice(0, 5).map((rec, idx) => (
            <div key={idx} className="p-3 bg-secondary/50 rounded-lg border border-border-primary/50 flex justify-between items-center">
              <div>
                <div className="text-sm font-medium">{rec.firm}</div>
                <div className="text-xs text-muted">{rec.date}</div>
              </div>
              <div className="text-right">
                <div
                  className={`text-sm font-bold font-mono ${
                    rec.rating === 'Buy'
                      ? 'text-green-400'
                      : rec.rating === 'Hold'
                        ? 'text-yellow-400'
                        : 'text-red-400'
                  }`}
                >
                  {rec.rating}
                </div>
                <div className="text-xs text-muted font-mono">{rec.targetPrice}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}