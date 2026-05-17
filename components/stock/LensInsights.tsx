'use client';

import { Stock, RishiScore } from '../../lib/types';

interface Props {
  stock: Stock;
  scores: RishiScore[];
}

export function LensInsights({ stock, scores }: Props) {
  if (!stock || !scores || scores.length === 0) {
    return null;
  }

  const topRishi = scores[0];

  return (
    <div className="card-sacred p-6">
      <div>
        <div className="philosophy-heading text-lg mb-2">{topRishi.full} Verdict</div>
        <p className="rishi-insight text-sm">{topRishi.insight}</p>
      </div>

      <div className="mt-6 space-y-3">
        {topRishi.comps.slice(0, 3).map((comp, idx) => (
          <div key={idx} className="p-3 bg-secondary/50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm font-medium">{comp.label}</div>
              <div className="text-sm font-mono text-accent-gold">{comp.v}/100</div>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-gold rounded-full transition-all duration-500"
                style={{ width: `${comp.v}%` }}
              />
            </div>
            <div className="text-xs text-muted mt-2">{comp.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}