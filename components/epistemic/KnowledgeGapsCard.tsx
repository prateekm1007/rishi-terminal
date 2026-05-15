import React from 'react';

interface Props {
  knowledgeGaps: string[];
}

export const KnowledgeGapsCard: React.FC<Props> = ({ knowledgeGaps }) => {
  if (!knowledgeGaps || knowledgeGaps.length === 0) return null;

  return (
    <div className="p-4 bg-yellow-900/10 border border-yellow-900/30 rounded-lg">
      <h4 className="text-sm font-bold text-yellow-400 mb-2 uppercase tracking-wide">Knowledge Gaps</h4>
      <ul className="space-y-1">
        {knowledgeGaps.map((gap, i) => (
          <li key={i} className="text-xs text-yellow-200">• {gap}</li>
        ))}
      </ul>
    </div>
  );
};