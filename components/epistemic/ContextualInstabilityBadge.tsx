import React from 'react';

interface Props {
  contextualInstability: number;
}

export const ContextualInstabilityBadge: React.FC<Props> = ({ contextualInstability }) => {
  const level = contextualInstability > 0.6 ? 'HIGH' : contextualInstability > 0.3 ? 'MODERATE' : 'LOW';
  const color = level === 'HIGH' ? 'text-red-400' : level === 'MODERATE' ? 'text-yellow-400' : 'text-green-400';

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded border ${
      level === 'HIGH' ? 'bg-red-900/20 border-red-900/50' :
      level === 'MODERATE' ? 'bg-yellow-900/20 border-yellow-900/50' :
      'bg-green-900/20 border-green-900/50'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${color.replace('text-', 'bg-')} animate-pulse`}></span>
      <span className={`text-xs font-bold ${color}`}>{level} INSTABILITY</span>
    </div>
  );
};