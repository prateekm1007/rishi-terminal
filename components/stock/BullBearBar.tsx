'use client';
import { useLanguage } from '@/lib/language';

import { RishiScore } from '../../lib/types';
import { ProgressBar } from './StyleGuide';

interface Props {
  topBull: RishiScore;
  topBear: RishiScore;
  spread: number;
}

export function BullBearBar({ topBull, topBear, spread }: Props) {
  const { t } = useLanguage();
  if (!topBull || !topBear) return null;

  return (
    <div className="card-sacred p-6">
      <div className="philosophy-heading text-lg mb-6">Rishis' Consensus</div>

      <div className="grid grid-cols-2 gap-6">
        {/* Bull */}
        <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="text-xs text-green-400 mb-2 font-medium">🐂 TOP BULL</div>
          <div className="text-3xl font-bold text-green-400 font-mono">{topBull.score}</div>
          <div className="text-sm font-medium text-primary mt-2">{topBull.full}</div>
          <div className="text-xs text-muted mt-1">{topBull.label}</div>
          <div className="rishi-insight text-xs mt-4">{topBull.insight}</div>
        </div>

        {/* Bear */}
        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="text-xs text-red-400 mb-2 font-medium">🐻 TOP BEAR</div>
          <div className="text-3xl font-bold text-red-400 font-mono">{topBear.score}</div>
          <div className="text-sm font-medium text-primary mt-2">{topBear.full}</div>
          <div className="text-xs text-muted mt-1">{topBear.label}</div>
          <div className="rishi-insight text-xs mt-4">{topBear.insight}</div>
        </div>
      </div>

      {/* Opinion Spread */}
      <div className="mt-6 pt-6 border-t border-border-primary">
        <div className="philosophy-subheading text-xs mb-4">{t("common.philosophicalSpread")}</div>
        <ProgressBar value={spread} max={100} color="gold" />
        <div className="text-xs text-secondary mt-3">
          {spread < 15 && '✓ Strong consensus among Rishis'}
          {spread >= 15 && spread < 30 && '→ Moderate disagreement'}
          {spread >= 30 && spread < 50 && '⚠️ Philosophical tension'}
          {spread >= 50 && '⚡ Deep conflict in views'}
        </div>
      </div>
    </div>
  );
}