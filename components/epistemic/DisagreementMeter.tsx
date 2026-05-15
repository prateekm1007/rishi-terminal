import React from 'react';

interface Props {
  disagreementIndex: number;
  label: string;
}

export const DisagreementMeter: React.FC<Props> = ({ disagreementIndex, label }) => {
  const percentage = disagreementIndex * 100;
  
  let color = '#22C55E'; // Green
  if (percentage > 30) color = '#EAB308'; // Yellow
  if (percentage > 50) color = '#F97316'; // Orange
  if (percentage > 70) color = '#EF4444'; // Red

  return (
    <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-400">Consensus Disagreement</span>
        <span className="text-xs font-bold" style={{ color }}>{label}</span>
      </div>
      <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
        <div 
          className="h-full transition-all duration-500"
          style={{ 
            width: `${percentage}%`, 
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}40`
          }}
        />
      </div>
      <div className="mt-2 text-xs text-gray-500 text-right">
        {percentage.toFixed(0)}% divergence
      </div>
    </div>
  );
};