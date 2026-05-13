'use client';

import { RishiScore } from "../../lib/consensus/types";
import { RISHI_WEIGHT_CONFIG } from "../../lib/consensus/weights";
import { getRishisVisible, isPremium, getCurrentTier } from "../../lib/premium";
import Link from "next/link";
import { useState, useEffect } from "react";

interface Props {
  scores: RishiScore[];
}

function getTierLabel(weight: number): string {
  if (weight >= 3.0) return 'Legend';
  if (weight >= 2.0) return 'Master';
  return 'Specialist';
}

function getTierColor(weight: number): string {
  if (weight >= 3.0) return 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10';
  if (weight >= 2.0) return 'text-blue-400 border-blue-400/40 bg-blue-400/10';
  return 'text-zinc-400 border-zinc-600/40 bg-zinc-800/40';
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

export function RishiGrid({ scores }: Props) {
  const [visibleCount, setVisibleCount] = useState(20);
  const [premium, setPremium] = useState(true);
  const [expandedRishi, setExpandedRishi] = useState<string | null>(null);

  useEffect(() => {
    const tier = getCurrentTier();
    setVisibleCount(getRishisVisible(tier));
    setPremium(isPremium(tier));
  }, []);

  const visibleScores = scores.slice(0, visibleCount);
  const lockedCount = scores.length - visibleCount;

  return (
    <div className="card-sacred p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="philosophy-heading text-xl">
            All Rishis
          </h2>
          <p className="text-xs text-muted mt-1">
            {visibleScores.length} of {scores.length} sages • Sorted by conviction
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
              <span className="text-muted">Legend</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              <span className="text-muted">Master</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-zinc-500 inline-block" />
              <span className="text-muted">Specialist</span>
            </span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {visibleScores.map((rishi, idx) => {
          const weight = getWeightForRishi(rishi.name);
          const tierLabel = getTierLabel(weight);
          const tierColor = getTierColor(weight);
          const scoreColor = getScoreColor(rishi.score);
          const barColor = getScoreBarColor(rishi.score);
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
                  {rishi.score}
                </div>
              </div>

              {/* Score Bar */}
              <div className="h-1.5 bg-zinc-800 rounded-full mb-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                  style={{ width: `${rishi.score}%` }}
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
                        {comp.v}
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

                  {/* Insight */}
                  <div className="rishi-insight text-xs">
                    {rishi.insight}
                  </div>

                  {/* Weight info */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">Consensus weight</span>
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

        {/* Locked Cards */}
        {!premium && lockedCount > 0 && Array.from({ length: Math.min(lockedCount, 3) }).map((_, idx) => (
          <div
            key={`locked-${idx}`}
            className="border border-border-primary rounded-xl p-4 opacity-40 relative overflow-hidden"
          >
            <div className="absolute inset-0 backdrop-blur-sm bg-zinc-900/60 flex flex-col items-center justify-center z-10">
              <span className="text-2xl mb-2">🔒</span>
              <span className="text-xs text-muted text-center px-4">
                Upgrade to Student to unlock all 20 Rishis
              </span>
              <Link
                href="/pricing"
                className="mt-3 px-3 py-1.5 bg-accent-gold text-black text-xs font-bold rounded-lg"
                onClick={e => e.stopPropagation()}
              >
                Upgrade
              </Link>
            </div>
            {/* Blurred placeholder */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="h-3 bg-zinc-700 rounded w-24 mb-2" />
                <div className="h-2 bg-zinc-800 rounded w-16" />
              </div>
              <div className="h-8 w-8 bg-zinc-700 rounded" />
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full mb-3" />
            <div className="space-y-1.5">
              <div className="h-2 bg-zinc-800 rounded w-full" />
              <div className="h-2 bg-zinc-800 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>

      {/* Upgrade Banner */}
      {!premium && lockedCount > 0 && (
        <div className="mt-6 p-4 border border-accent-gold/30 rounded-xl bg-accent-gold/5 text-center">
          <p className="text-sm font-medium mb-1">
            {lockedCount} more Rishis await your wisdom
          </p>
          <p className="text-xs text-muted mb-3">
            Upgrade to Student tier to unlock all 20 philosophical lenses
          </p>
          <Link
            href="/pricing"
            className="inline-block px-6 py-2 bg-accent-gold text-black font-bold rounded-lg text-sm hover:bg-accent-gold/90 transition-colors"
          >
            Unlock All Rishis — 499/year
          </Link>
        </div>
      )}
    </div>
  );
}
