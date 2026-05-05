'use client';

import { WisdomGraphData } from '../../lib/wisdom/graph';

interface Props {
  data: WisdomGraphData;
}

export function WisdomGraph({ data }: Props) {
  return (
    <div className="card p-6">
      <div className="philosophy-heading text-base mb-4">Wisdom Knowledge Graph</div>
      
      <div className="mb-6">
        <div className="text-xs text-muted mb-3">KEY PRINCIPLES DETECTED:</div>
        <div className="flex flex-wrap gap-2">
          {data.nodes.filter(n => n.type === 'principle').map(node => (
            <div key={node.id} className="px-3 py-1 bg-accent-gold/10 border border-accent-gold/30 rounded text-xs">
              {node.label}
            </div>
          ))}
        </div>
      </div>

      {data.nodes.some(n => n.type === 'risk') && (
        <div className="mb-6">
          <div className="text-xs text-muted mb-3">RISK FACTORS:</div>
          <div className="flex flex-wrap gap-2">
            {data.nodes.filter(n => n.type === 'risk').map(node => (
              <div key={node.id} className="px-3 py-1 bg-accent-red/10 border border-accent-red/30 rounded text-xs text-accent-red">
                {node.label}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="text-xs text-muted mb-3">INSIGHTS:</div>
        <ul className="space-y-2">
          {data.insights.map((insight, i) => (
            <li key={i} className="text-xs text-secondary pl-3 border-l-2 border-border-primary">
              {insight}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}