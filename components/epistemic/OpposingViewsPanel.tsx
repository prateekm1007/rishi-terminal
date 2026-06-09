import React from 'react';
import { useLanguage } from '../../lib/language';

interface Props {
  opposingViews: string[];
}

export const OpposingViewsPanel: React.FC<Props> = ({ opposingViews }) => {
  const { t } = useLanguage();
  if (!opposingViews || opposingViews.length === 0) return null;

  return (
    <div className="p-4 bg-red-900/10 border border-red-900/30 rounded-lg">
      <h4 className="text-sm font-bold text-red-400 mb-2 uppercase tracking-wide">{t("epistemic.opposingViews")}</h4>
      <ul className="space-y-2">
        {opposingViews.map((view, i) => (
          <li key={i} className="text-xs text-red-200 flex items-start gap-2">
            <span className="mt-1 w-1 h-1 bg-red-400 rounded-full flex-shrink-0"></span>
            {view}
          </li>
        ))}
      </ul>
    </div>
  );
};