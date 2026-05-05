'use client';

import { LensAnalysis } from '../../lib/wisdom/lens';

interface Props {
  analysis: LensAnalysis;
  rishiName: string;
}

export function LensInsights({ analysis, rishiName }: Props) {
  return (
    <div className="card-sacred p-6 space-y-6">
      <div>
        <div className="philosophy-heading text-lg mb-2">{rishiName} Verdict</div>
        <p className="rishi-insight text-sm">{analysis.verdict}</p>
      </div>

      <div>
        <div className="text-xs text-muted mb-3">KEY METRICS UNDER THIS LENS:</div>
        <div className="space-y-2">
          {analysis.keyMetrics.map((m, i) => (
            <div key={i} className="flex justify-between items-center p-2 bg-secondary rounded">
              <span className="text-xs">{m.metric}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">{m.value}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  m.assessment.includes('Excellent') || m.assessment.includes('Attractive') || m.assessment.includes('Conservative') || m.assessment.includes('Strong')
                    ? 'bg-accent-green/20 text-accent-green'
                    : m.assessment.includes('Good') || m.assessment.includes('Fair') || m.assessment.includes('Moderate') || m.assessment.includes('Decent')
                    ? 'bg-accent-gold/20 text-accent-gold'
                    : 'bg-accent-red/20 text-accent-red'
                }`}>
                  {m.assessment}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs text-accent-red mb-2">RISKS:</div>
        <ul className="space-y-1">
          {analysis.risks.map((r, i) => (
            <li key={i} className="text-xs text-secondary pl-3 border-l-2 border-accent-red">
              {r}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="text-xs text-accent-green mb-2">OPPORTUNITIES:</div>
        <ul className="space-y-1">
          {analysis.opportunities.map((o, i) => (
            <li key={i} className="text-xs text-secondary pl-3 border-l-2 border-accent-green">
              {o}
            </li>
          ))}
        </ul>
      </div>

      <blockquote className="border-l-2 border-accent-gold pl-4 italic text-xs text-muted">
        {analysis.quote}
      </blockquote>
    </div>
  );
}