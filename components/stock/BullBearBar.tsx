"use client";
import { RishiScore } from "../../lib/consensus/types";

interface Props {
  topBull: RishiScore;
  topBear: RishiScore;
}

export function BullBearBar({ topBull, topBear }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="border border-emerald-800 bg-emerald-950/30 rounded p-4">
        <p className="text-xs text-emerald-500 font-mono uppercase tracking-widest mb-1">
          Top Bull
        </p>
        <p className="text-lg font-cinzel text-emerald-300">{topBull.full}</p>
        <p className="text-3xl font-mono font-bold text-emerald-400 mt-1">
          {topBull.score}
          <span className="text-sm text-emerald-600 ml-1">/100</span>
        </p>
        <p className="text-xs text-emerald-600 mt-2 font-mono leading-relaxed">
          {topBull.insight}
        </p>
      </div>

      <div className="border border-red-900 bg-red-950/20 rounded p-4">
        <p className="text-xs text-red-500 font-mono uppercase tracking-widest mb-1">
          Top Bear
        </p>
        <p className="text-lg font-cinzel text-red-300">{topBear.full}</p>
        <p className="text-3xl font-mono font-bold text-red-400 mt-1">
          {topBear.score}
          <span className="text-sm text-red-700 ml-1">/100</span>
        </p>
        <p className="text-xs text-red-700 mt-2 font-mono leading-relaxed">
          {topBear.insight}
        </p>
      </div>
    </div>
  );
}