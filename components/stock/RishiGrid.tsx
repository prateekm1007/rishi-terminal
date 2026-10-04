'use client';

import { RishiScore } from "../../lib/types";
// N1: weights are public methodology metadata (S2-01) — lib/gurus/weights,
// not the server-only engine module lib/consensus/weights.
import { RISHI_WEIGHT_CONFIG } from "../../lib/gurus/weights";
import { useState } from "react";
import { useLanguage } from '../../lib/language';

interface Props {
  symbol: string;
  /**
   * Verdicts come from the server — the FULL set for every visitor
   * (Commit M3 free access: the RSC payload carries the complete council;
   * there is no tier slice and no client-side upgrade). This component
   * only renders what the server sent.
   */
  verdicts: RishiScore[];
  totalRishis: number;
}

/** X6 (Round 13): the tier comes FROM the published methodology config
 *  (RISHI_WEIGHT_CONFIG.tier — S2-01), never re-derived from the weight.
 *  The old weight-threshold derivation contradicted the config it sat
 *  next to: Graham and Lynch are configured Legend at weight 2.5, but the
 *  threshold (>= 3.0 = Legend) badged them Master on every stock page
 *  while test/x6.consensusGates.test.ts pinned the config at 3/7/10. One
 *  source of truth (Rule 14): the config. An unconfigured name can no
 *  longer happen silently — the engine's getWeight throws and the gate
 *  fails — but the render still fails honest (dashes, no invented tier). */
function getTierForRishi(name: string): { label: string; color: string } {
  const config = RISHI_WEIGHT_CONFIG.find(w => w.name === name);
  const tier = config?.tier;
  if (tier === 'Legend') return { label: 'Legend', color: 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10' };
  if (tier === 'Master') return { label: 'Master', color: 'text-blue-400 border-blue-400/40 bg-blue-400/10' };
  if (tier === 'Specialist') return { label: 'Specialist', color: 'text-zinc-400 border-zinc-600/40 bg-zinc-800/40' };
  return { label: '—', color: 'text-zinc-400 border-zinc-600/40 bg-zinc-800/40' };
}

function getScoreColor(score: number): string {
  if (score >= 75) return 'text-green-400';
  if (score >= 55) return 'text-yellow-400';
  if (score >= 35) return 'text-orange-400';
  return 'text-red-400';
}

function getScoreBarColor(score: number): string {
  if (score >= 75) return 'bg-green-500';
  if (score >= 55) return 'bg-yellow-500';
  if (score >= 35) return 'bg-orange-500';
  return 'bg-red-500';
}

function getWeightForRishi(name: string): number {
  const config = RISHI_WEIGHT_CONFIG.find(w => w.name === name);
  return config?.weight ?? 1.0;
}

export function RishiGrid({ verdicts, totalRishis }: Props) {
  const { t } = useLanguage();
  const [expandedRishi, setExpandedRishi] = useState<string | null>(null);

  // Free access: the server sent every verdict — nothing is locked.
  const visibleScores = verdicts;

  return (
    <div className="card-sacred p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="philosophy-heading text-xl">
            All Rishis
          </h2>
          <p className="text-xs text-muted mt-1">
            {visibleScores.length} of {totalRishis} sages • Sorted by conviction
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
              <span className="text-muted">{t("rishiGrid.legend")}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              <span className="text-muted">{t("rishiGrid.master")}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-zinc-500 inline-block" />
              <span className="text-muted">{t("rishiGrid.specialist")}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {visibleScores.map((rishi, idx) => {
          const weight = getWeightForRishi(rishi.name);
          const { label: tierLabel, color: tierColor } = getTierForRishi(rishi.name);
          const scoreColor = rishi.score === null ? '#64748B' : getScoreColor(rishi.score);
          const barColor = rishi.score === null ? 'rgba(100,116,139,0.3)' : getScoreBarColor(rishi.score);
          const isExpanded = expandedRishi === rishi.name;

          return (
            <div
              key={rishi.name}
              className="border border-border-primary rounded-xl p-4 hover:border-accent-gold/40 transition-all duration-200 cursor-pointer group"
              style={{ animationDelay: `${idx * 30}ms` }}
              onClick={() => setExpandedRishi(isExpanded ? null : rishi.name)}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span style={{
                      fontSize: "9px",
                      padding: "2px 6px",
                      background: "rgba(251,191,36,0.1)",
                      color: "#FFC107",
                      border: "1px solid rgba(251,191,36,0.3)",
                      borderRadius: "4px",
                      fontWeight: 600,
                      letterSpacing: "0.5px",
                      whiteSpace: "nowrap"
                    }}>
                      Inspired by
                    </span>
                    <span className="font-bold text-sm text-primary truncate">
                      {rishi.full}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${tierColor} shrink-0`}>
                      {tierLabel}
                    </span>
                  </div>
                  <div className="text-xs text-muted">
                    {rishi.label} • {rishi.origin}
                  </div>
                </div>
                <div className={`text-2xl font-bold ml-3 ${scoreColor}`}>
                  {rishi.score === null ? '—' : rishi.score}
                </div>
              </div>

              {/* Score Bar */}
              <div className="h-1.5 bg-zinc-800 rounded-full mb-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                  style={{ width: rishi.score === null ? '0%' : `${rishi.score}%` }}
                />
              </div>

              {/* Components */}
              <div className="space-y-1.5">
                {rishi.comps.slice(0, isExpanded ? rishi.comps.length : 2).map((comp, cIdx) => (
                  <div key={cIdx} className="flex items-center justify-between text-xs">
                    <span className="text-muted truncate flex-1 mr-2">
                      {comp.label}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getScoreBarColor(comp.v)}`}
                          style={{ width: `${comp.v}%` }}
                        />
                      </div>
                      <span className={`font-mono w-6 text-right ${getScoreColor(comp.v)}`}>
                        {Math.round(comp.v)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Expanded: Insight + All Components */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-border-primary space-y-3">
                  {/* All comps with weight */}
                  <div className="space-y-2">
                    {rishi.comps.map((comp, cIdx) => (
                      <div key={cIdx} className="text-xs">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-secondary">{comp.label}</span>
                          <span className="text-muted">{comp.wt}% weight</span>
                        </div>
                        <div className="text-muted text-xs italic">
                          {comp.detail}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* S2-05: the published arithmetic — the breakdown above is
                      the ACTUAL scoring math, not a decoration. */}
                  {rishi.score !== null && rishi.scoreRaw != null && (
                    <div className="text-muted text-xs font-mono">
                      Σ pillar × weight = {rishi.scoreRaw.toFixed(2)} → score {rishi.score}
                    </div>
                  )}

                  {/* Insight */}
                  <div className="rishi-insight text-xs">
                    {rishi.insight}
                  </div>

                  {/* Weight info */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">{t("rishiGrid.consensusWeight")}</span>
                    <span className={`font-mono ${tierColor.split(' ')[0]}`}>
                      {weight}x
                    </span>
                  </div>
                </div>
              )}

              {/* Expand toggle */}
              <button className="mt-3 text-xs text-muted hover:text-accent-gold transition-colors w-full text-center">
                {isExpanded ? '▲ Less' : '▼ More'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
