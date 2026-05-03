import { RishiScore, RishiWeight } from "./types";

/**
 * Rishi Merit Weights
 * Tier 1 Legends:    3.0 - Multi-decade documented track records
 * Tier 2 Masters:    2.0 - Proven philosophy, strong results
 * Tier 3 Specialists: 1.0 - Valid but narrower scope
 *
 * Names must match the `name` field on each RishiScore exactly.
 */
export const RISHI_WEIGHT_CONFIG: RishiWeight[] = [
  { name: "Buffett",       weight: 3.0, tier: "Legend"     },
  { name: "Graham",        weight: 2.5, tier: "Legend"     },
  { name: "Lynch",         weight: 2.5, tier: "Legend"     },
  { name: "Damani",        weight: 2.0, tier: "Master"     },
  { name: "Munger",        weight: 2.0, tier: "Master"     },
  { name: "Jhunjhunwala",  weight: 2.0, tier: "Master"     },
  { name: "Pabrai",        weight: 2.0, tier: "Master"     },
  { name: "HowardMarks",   weight: 2.0, tier: "Master"     },
  { name: "SethKlarman",   weight: 2.0, tier: "Master"     },
  { name: "Kacholia",      weight: 1.0, tier: "Specialist" },
  { name: "Kedia",         weight: 1.0, tier: "Specialist" },
  { name: "Porinju",       weight: 1.0, tier: "Specialist" },
  { name: "Raamdeo",       weight: 1.0, tier: "Specialist" },
  { name: "Nemish",        weight: 1.0, tier: "Specialist" },
  { name: "Basant",        weight: 1.0, tier: "Specialist" },
  { name: "PhilipFisher",  weight: 1.0, tier: "Specialist" },
  { name: "Greenblatt",    weight: 1.0, tier: "Specialist" },
  { name: "Templeton",     weight: 1.0, tier: "Specialist" },
  { name: "Schloss",       weight: 1.0, tier: "Specialist" },
];

const WEIGHT_MAP: Record<string, number> = Object.fromEntries(
  RISHI_WEIGHT_CONFIG.map(r => [r.name, r.weight])
);

export function getWeight(name: string): number {
  return WEIGHT_MAP[name] ?? 1.0;
}

export function weightedAverage(scores: RishiScore[]): number {
  if (scores.length === 0) return 0;
  let totalWeighted = 0;
  let totalWeight   = 0;
  for (const s of scores) {
    const w    = getWeight(s.name);
    totalWeighted += s.score * w;
    totalWeight   += w;
  }
  return Math.round(totalWeighted / totalWeight);
}