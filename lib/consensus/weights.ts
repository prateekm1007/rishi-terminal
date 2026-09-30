import { RishiScore, RishiWeight } from "./types";

export const RISHI_WEIGHT_CONFIG: RishiWeight[] = [
  { name: "Buffett",       weight: 3.0, tier: "Legend"     },
  { name: "Graham",        weight: 2.5, tier: "Legend"     },
  { name: "Lynch",         weight: 2.5, tier: "Legend"     },
  { name: "Munger",        weight: 2.0, tier: "Master"     },
  { name: "Damani",        weight: 2.0, tier: "Master"     },
  { name: "Jhunjhunwala",  weight: 2.0, tier: "Master"     },
  { name: "Pabrai",        weight: 2.0, tier: "Master"     },
  { name: "HowardMarks",   weight: 2.0, tier: "Master"     },
  { name: "SethKlarman",   weight: 2.0, tier: "Master"     },
  { name: "Soros",         weight: 2.0, tier: "Master"     },
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

/**
 * Minimum number of valid (finite, non-null) scorer results required to
 * produce a consensus (remediation T11). Chosen as 12 of 20: a majority of
 * the panel spanning every weight tier (3 Legend + 7 Master + 2 Specialist
 * minimum) so a consensus always reflects broad philosophical agreement, not
 * a handful of opinions. Below this the consensus is `null` — "Insufficient
 * Data" — and is displayed as "—" and sorted last, never coerced to 0.
 */
export const MIN_VALID_SCORERS = 12;

export function weightedAverage(scores: RishiScore[]): number | null {
  const valid = scores.filter(s => s.score !== null && Number.isFinite(s.score));
  if (valid.length < MIN_VALID_SCORERS) return null;
  let totalWeighted = 0;
  let totalWeight   = 0;
  for (const s of valid) {
    const w = getWeight(s.name);
    totalWeighted += (s.score as number) * w;
    totalWeight   += w;
  }
  return Math.round(totalWeighted / totalWeight);
}