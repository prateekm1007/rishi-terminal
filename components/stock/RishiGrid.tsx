"use client";
import { RishiScore } from "../../lib/consensus/types";
import { RISHI_WEIGHT_CONFIG } from "../../lib/consensus/weights";
import { getRishisVisible, isPremium } from "../../lib/premium";
import Link from "next/link";

interface Props {
  scores: RishiScore[];
}

function getTier(name: string): string {
  return RISHI_WEIGHT_CONFIG.find(r => r.name === name)?.tier ?? "Specialist";
}

function tierBadgeStyle(tier: string): string {
  if (tier === "Legend") return "bg-amber-900/50 text-amber-400 border border-amber-800";
  if (tier === "Master") return "bg-blue-900/30 text-blue-400 border border-blue-900";
  return "bg-zinc-800 text-zinc-400 border border-zinc-700";
}

function scoreFill(score: number): string {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 55) return "bg-yellow-500";
  if (score >= 35) return "bg-orange-500";
  return "bg-red-500";
}

function scoreTextColor(score: number): string {
  if (score >= 75) return "text-emerald-400";
  if (score >= 55) return "text-yellow-400";
  if (score >= 35) return "text-orange-400";
  return "text-red-400";
}

export function RishiGrid({ scores }: Props) {
  const rishisVisible = getRishisVisible();
  const premium = isPremium();
  const visibleScores = premium ? scores : scores.slice(0, rishisVisible);
  const lockedCount = scores.length - rishisVisible;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
          All Rishis — Sorted by Conviction
        </h2>
        {!premium && (
          <Link
            href="/pricing"
            className="text-xs font-mono text-amber-500 hover:text-amber-400 transition-colors"
          >
            Unlock {lockedCount} more Rishis →
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visibleScores.map((s, i) => {
          const tier = getTier(s.name);
          return (
            <div
              key={s.name}
              className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-4 hover:border-zinc-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-zinc-600 font-mono">#{i + 1}</span>
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${tierBadgeStyle(tier)}`}>
                      {tier}
                    </span>
                  </div>
                  <p className="font-cinzel text-zinc-100 text-sm leading-tight">{s.full}</p>
                  <p className="text-xs text-zinc-500 font-mono mt-0.5">{s.label} · {s.origin}</p>
                </div>
                <span className={`text-2xl font-mono font-bold ${scoreTextColor(s.score)}`}>
                  {s.score}
                </span>
              </div>

              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full ${scoreFill(s.score)}`}
                  style={{ width: `${s.score}%` }}
                />
              </div>

              <p className="text-xs text-zinc-500 font-mono leading-relaxed line-clamp-2">
                {s.insight}
              </p>

              <div className="mt-3 space-y-1.5">
                {s.comps.map(c => (
                  <div key={c.label} className="flex items-center justify-between">
                    <span className="text-xs text-zinc-600 font-mono truncate mr-2">{c.label}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-16 h-0.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className={`h-full ${scoreFill(c.v)}`} style={{ width: `${c.v}%` }} />
                      </div>
                      <span className={`text-xs font-mono w-6 text-right ${scoreTextColor(c.v)}`}>
                        {c.v}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Locked Rishis Placeholder */}
        {!premium && lockedCount > 0 && (
          <Link
            href="/pricing"
            className="border-2 border-dashed border-amber-700/50 bg-zinc-900/20 rounded-lg p-4 hover:border-amber-600 hover:bg-zinc-900/40 transition-all flex flex-col items-center justify-center text-center min-h-[200px] group"
          >
            <div className="text-4xl mb-3 opacity-50 group-hover:opacity-100 transition-opacity">🔒</div>
            <p className="font-cinzel text-amber-400 text-sm mb-2">
              {lockedCount} More Rishis Locked
            </p>
            <p className="text-xs text-zinc-500 font-mono mb-4">
              Unlock all {scores.length} philosophical perspectives
            </p>
            <span className="text-xs font-mono text-amber-500 group-hover:text-amber-400">
              Upgrade to Premium →
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}