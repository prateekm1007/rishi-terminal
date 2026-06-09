import React from 'react';
import { useLanguage } from '../../lib/language';

interface PhilosophySignal {
  score: number;
  signal: string;
  confidence: number;
}

interface Props {
  philosophyDivergence: Record<string, PhilosophySignal>;
}

export const PhilosophyDivergenceMap: React.FC<Props> = ({ philosophyDivergence }) => {
  const { t } = useLanguage();
  const entries = Object.entries(philosophyDivergence);

  return (
    <div className="p-4 bg-gray-900 rounded-lg border border-gray-800 h-full overflow-y-auto">
      <h4 className="text-sm font-bold text-gray-300 mb-3 uppercase tracking-wide">{t("epistemic.philosophyDivergence")}</h4>
      <div className="space-y-3">
        {entries.map(([name, data]) => (
          <div key={name} className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
            <span className="text-xs text-gray-400 truncate w-24" title={name}>{name}</span>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                data.signal === 'STRONG_BUY' ? 'bg-green-900 text-green-400' :
                data.signal === 'BUY' ? 'bg-green-900/50 text-green-300' :
                data.signal === 'SELL' ? 'bg-red-900/50 text-red-300' :
                data.signal === 'STRONG_SELL' ? 'bg-red-900 text-red-400' :
                'bg-gray-700 text-gray-400'
              }`}>
                {data.signal.replace('_', ' ')}
              </span>
              <span className="text-xs font-mono text-gray-300">
                {data.score}/100
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};