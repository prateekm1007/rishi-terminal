'use client';

import { Stock, RishiScore } from '../../lib/types';

interface Props {
  stock: Stock;
  scores: RishiScore[];
}

export function WisdomGraph({ stock, scores }: Props) {
  if (!stock || !scores || scores.length === 0) {
    return null;
  }

  // Extract principles from top Rishis
  const topRishis = scores.slice(0, 5);
  const principles = topRishis.map(r => r.label);

  return (
    <div className="card-sacred p-6">
      <h3 className="philosophy-heading text-lg mb-4">Wisdom Graph</h3>
      <div className="text-xs text-muted mb-3">KEY PRINCIPLES DETECTED:</div>
      <div className="flex flex-wrap gap-2">
        {principles.map((principle, idx) => (
          <div key={idx} className="px-3 py-1 bg-accent-gold/10 border border-accent-gold/30 rounded text-xs">
            {principle}
          </div>
        ))}
      </div>
      <div className="mt-6 p-4 bg-secondary/50 rounded-lg text-center text-xs text-muted">
        Interactive knowledge graph coming soon
      </div>
    </div>
  );
}