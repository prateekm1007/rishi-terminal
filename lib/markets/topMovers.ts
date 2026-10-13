/**
 * Top movers (13 Oct 2026): pure ranking for the dashboard panel.
 *
 * Only quotes sourced from NSE are ranked. The NSE permission letter covers
 * NSE's quote endpoints and nothing else. A null change is unavailability,
 * never zero. A quote without an upstream observation time is not ranked, and
 * neither is one older than the window. Ties break by symbol.
 */
export const MOVER_COUNT = 5;
export const MOVER_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const PERMITTED_MOVER_SOURCE = "nse";

export interface MoverInput {
  symbol: string;
  name: string;
  price: number;
  change: number | null;
  observedAt: string | null;
  source: string;
}

export interface MoverRow extends MoverInput {
  change: number;
}

export interface MoversExcluded {
  notPermittedSource: number;
  nullChange: number;
  undated: number;
  stale: number;
  invalidPrice: number;
}

export interface MoversResult {
  status: "ready" | "insufficient";
  movers: MoverRow[];
  winners: MoverRow[];
  losers: MoverRow[];
  eligible: number;
  considered: number;
  excluded: MoversExcluded;
}

export function rankTopMovers(
  inputs: readonly MoverInput[],
  opts: { nowMs: number; maxAgeMs?: number },
): MoversResult {
  const maxAge = opts.maxAgeMs ?? MOVER_MAX_AGE_MS;
  const excluded: MoversExcluded = {
    notPermittedSource: 0,
    nullChange: 0,
    undated: 0,
    stale: 0,
    invalidPrice: 0,
  };
  const eligible: MoverRow[] = [];
  for (const r of inputs) {
    if (r.source !== PERMITTED_MOVER_SOURCE) {
      excluded.notPermittedSource += 1;
      continue;
    }
    if (r.change === null || !Number.isFinite(r.change)) {
      excluded.nullChange += 1;
      continue;
    }
    if (!Number.isFinite(r.price) || r.price <= 0) {
      excluded.invalidPrice += 1;
      continue;
    }
    const t = r.observedAt === null ? NaN : Date.parse(r.observedAt);
    if (!Number.isFinite(t)) {
      excluded.undated += 1;
      continue;
    }
    if (opts.nowMs - t > maxAge) {
      excluded.stale += 1;
      continue;
    }
    eligible.push({ ...r, change: r.change });
  }
  const bySymbol = (a: MoverRow, b: MoverRow): number => a.symbol.localeCompare(b.symbol);
  const winners = eligible
    .filter((r) => r.change > 0)
    .sort((a, b) => b.change - a.change || bySymbol(a, b))
    .slice(0, MOVER_COUNT);
  const losers = eligible
    .filter((r) => r.change < 0)
    .sort((a, b) => a.change - b.change || bySymbol(a, b))
    .slice(0, MOVER_COUNT);
  const movers = eligible
    .filter((r) => r.change !== 0)
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change) || bySymbol(a, b))
    .slice(0, MOVER_COUNT);
  return {
    status: eligible.length >= MOVER_COUNT ? "ready" : "insufficient",
    movers,
    winners,
    losers,
    eligible: eligible.length,
    considered: inputs.length,
    excluded,
  };
}
