"use client";

interface Props {
  consensus: number;
  category: string;
  tension: string;
  tensionSpread: number;
  totalRishis: number;
  weightedBy: string;
}

function scoreColor(score: number): string {
  if (score >= 75) return "text-emerald-400";
  if (score >= 55) return "text-yellow-400";
  return "text-brand-red";
}

function scoreBorderColor(score: number): string {
  if (score >= 75) return "border-emerald-700";
  if (score >= 55) return "border-yellow-700";
  return "border-brand-red/50";
}

function tensionColor(spread: number): string {
  if (spread < 15) return "text-emerald-500";
  if (spread < 30) return "text-yellow-500";
  if (spread < 50) return "text-orange-500";
  return "text-brand-red";
}

export function ConsensusHero({
  consensus,
  category,
  tension,
  tensionSpread,
  totalRishis,
  weightedBy,
}: Props) {
  return (
    <div className={`border rounded-lg p-8 bg-brand-charcoal ${scoreBorderColor(consensus)}`}>
      <div className="flex items-start justify-between flex-wrap gap-6">

        <div>
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2">
            Rishi Consensus — {totalRishis} Sages · {weightedBy}
          </p>
          <div className="flex items-end gap-4">
            <span className={`text-8xl font-mono font-black ${scoreColor(consensus)}`}>
              {consensus}
            </span>
            <div className="pb-3">
              <span className="text-2xl text-zinc-600 font-mono">/100</span>
            </div>
          </div>
          <p className="text-xl font-cinzel text-zinc-200 mt-2">{category}</p>
        </div>

        <div className="border border-zinc-800 rounded p-4 min-w-[200px]">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-3">
            Philosophy Tension
          </p>
          <p className={`text-lg font-mono font-semibold ${tensionColor(tensionSpread)}`}>
            {tension}
          </p>
          <div className="mt-3 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-brand-red"
              style={{ width: `${Math.min(tensionSpread, 100)}%` }}
            />
          </div>
          <p className="text-xs text-zinc-600 font-mono mt-1">
            Spread: {tensionSpread} pts
          </p>
        </div>

      </div>

      <div className="mt-6">
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              consensus >= 75
                ? "bg-emerald-500"
                : consensus >= 55
                ? "bg-yellow-500"
                : "bg-brand-red"
            }`}
            style={{ width: `${consensus}%` }}
          />
        </div>
      </div>
    </div>
  );
}