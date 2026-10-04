// lib/consensus/council.ts
// R4-04 (Round 13): the Rishi Council view — consensus PLUS dissent.
//
// For every scorer verdict on a stock:
//   - status: pass (score >= 55, the same bar the UI colors green),
//     fail (score < 55), or no-verdict (T11 null — insufficient data);
//   - WHY: the published pillars (S2-05 made them exact) — for a pass the
//     strongest drivers first, for a fail the weakest (each detail string
//     already carries the input value and its threshold);
//   - WHAT WOULD CHANGE (fails only): a lever path computed FROM the
//     scorer's own thresholds. A lever substitutes specific field values
//     (e.g. "EPS CAGR → ≥ 12%") and the engine VERIFIES the flip by
//     re-running the actual scorer on the substituted record — a lever
//     that does not flip is not reported. If no combination of the
//     declared levers reaches a pass, the row says so honestly
//     ("no lever path — structural miss").
//
// Levers are DECLARATIVE per scorer (the threshold map lives here, right
// next to the code that consumes it via re-verification — if a scorer's
// thresholds change and its levers go stale, the re-run stops flipping
// and the council honestly reports no path; the acceptance test
// test/r4-04.council.test.ts enforces exactly this contract).

import 'server-only';

import { Stock, RishiScore } from './types';
import { SCORER_REGISTRY, runAllScorers } from './orchestrator';

export const COUNCIL_PASS_BAR = 55;

export interface Lever {
  /** The pillar this lever targets (matches the published comps label). */
  pillar: string;
  /** Human-readable change, with before→after values filled per stock. */
  describe: (s: Stock) => string;
  /** The substitution (pure; returns the substituted record). */
  apply: (s: Stock) => Stock;
}

type ScorerFn = (s: Stock) => RishiScore;

/** Convenience: set one field (numeric or string). */
function withField(s: Stock, field: keyof Stock, value: number | string): Stock {
  return { ...s, [field]: value } as Stock;
}

/**
 * The per-scorer lever table. Values saturate the named pillar's
 * threshold (each value is the documented saturation point of that
 * scorer — see docs/methodology/<slug>.md).
 */
export const SCORER_LEVERS: ReadonlyArray<{ name: string; levers: Lever[] }> = [
  {
    name: 'Buffett',
    levers: [
      { pillar: 'ROE Sustainability', describe: s => `ROE ${s.roe}% → ≥20%`, apply: s => withField(s, 'roe', 20) },
      { pillar: 'Economic Moat', describe: s => `OPM ${s.opm}% → ≥20%`, apply: s => withField(s, 'opm', 20) },
      { pillar: 'Owner Earnings Yield', describe: () => `owner earnings → ≥8% of market cap (np + dep − 0.7·capex ≥ 0.08·mktcap)`, apply: s => withField(s, 'np', 0.08 * s.mktcap - s.dep + 0.7 * s.capex) },
      { pillar: 'Management Skin', describe: s => `promoter ${s.promo}% → ≥30%`, apply: s => withField(s, 'promo', 30) },
    ],
  },
  {
    name: 'Munger',
    levers: [
      { pillar: 'Circle of Competence', describe: s => `ROCE ${s.roce}% → ≥25% AND D/E → ≤0.5`, apply: s => withField(withField(s, 'roce', 25), 'de', 0.5) },
      { pillar: 'Inversion Check', describe: s => s.de > 2 ? `D/E ${s.de} → ≤2 (no disqualifying flag)` : `FCF → positive (no disqualifying flag)`, apply: s => withField(withField(s, 'fcf', 1), 'de', Math.min(s.de, 2)) },
      { pillar: 'Lollapalooza Effect', describe: s => `ROE ${s.roe}% & ROCE ${s.roce}% → both ≥20%`, apply: s => withField(withField(s, 'roe', 20), 'roce', 20) },
      { pillar: 'Patience Filter', describe: s => `promoter ${s.promo}% → ≥40%`, apply: s => withField(s, 'promo', 40) },
    ],
  },
  {
    name: 'Lynch',
    levers: [
      { pillar: 'PEG Ratio', describe: s => `EPS CAGR ${s.epscagr}% → ≥ P/E ${s.pe} (PEG ≤ 1)`, apply: s => withField(s, 'epscagr', Math.max(s.pe, 1)) },
      { pillar: 'EPS Growth Rate', describe: s => `EPS CAGR ${s.epscagr}% → ≥15%`, apply: s => withField(s, 'epscagr', 15) },
      { pillar: 'Free Cash Flow', describe: () => `FCF → positive`, apply: s => withField(s, 'fcf', 1) },
      { pillar: 'Revenue Story', describe: s => `revenue CAGR ${s.revcagr}% → ≥12%`, apply: s => withField(s, 'revcagr', 12) },
    ],
  },
  {
    name: 'Graham',
    levers: [
      { pillar: 'NCAV Discount', describe: () => `current assets → NCAV ≥ 1.3× price (ca → tl + 1.3·price·shares)`, apply: s => withField(s, 'ca', s.tl + 1.3 * s.price * s.sh) },
      { pillar: 'P/E Value', describe: s => `P/E ${s.pe} → ≤15 (positive earnings)`, apply: s => withField(s, 'pe', 15) },
      { pillar: 'Current Ratio Safety', describe: () => `current ratio → ≥2 (ca → 2·tl)`, apply: s => withField(s, 'ca', 2 * Math.max(1, s.tl)) },
      { pillar: 'Debt Safety', describe: s => `D/E ${s.de} → ≤0.5`, apply: s => withField(s, 'de', 0.5) },
    ],
  },
  {
    name: 'Greenblatt',
    levers: [
      { pillar: 'Return on Capital', describe: () => `net profit → ≥15% of market cap (ROC ≥25%)`, apply: s => withField(s, 'np', 0.15 * s.mktcap) },
      { pillar: 'Earnings Yield', describe: () => `net profit → ≥10% of market cap (EY ≥10%)`, apply: s => withField(s, 'np', 0.10 * s.mktcap) },
    ],
  },
  {
    name: 'Damani',
    levers: [
      { pillar: 'Zero-Debt Filter', describe: s => `D/E ${s.de} → ≤0.1`, apply: s => withField(s, 'de', 0.1) },
      { pillar: 'ROCE Sustainability', describe: s => `ROCE ${s.roce}% → ≥25%`, apply: s => withField(s, 'roce', 25) },
      { pillar: 'Cash Flow Predictability', describe: () => `FCF margin → ≥10% of revenue`, apply: s => withField(s, 'fcf', 0.10 * s.rev) },
      { pillar: 'Defensive Moat', describe: s => `OPM ${s.opm}% → ≥15%`, apply: s => withField(s, 'opm', 15) },
    ],
  },
  {
    name: 'Jhunjhunwala',
    levers: [
      { pillar: 'P/CF Ratio', describe: () => `operating cash flow → P/CF into the 25-35× band (ocf → mktcap/30)`, apply: s => withField(s, 'ocf', s.mktcap / 30) },
      { pillar: 'Growth Composite', describe: () => `rev CAGR → ≥10%, EPS CAGR → ≥15%, OPM → ≥17.5% (all three legs saturate)`, apply: s => withField(withField(withField(s, 'revcagr', 10), 'epscagr', 15), 'opm', 17.5) },
      { pillar: 'Quality ROCE/Debt/FCF', describe: () => `ROCE → ≥15%, D/E → ≤0.5, FCF margin → ≥8% (all three legs saturate)`, apply: s => withField(withField(withField(s, 'roce', 15), 'de', Math.min(s.de, 0.5)), 'fcf', 0.08 * s.rev) },
      { pillar: 'Promoter Conviction', describe: s => `promoter ${s.promo}% → ≥45%`, apply: s => withField(s, 'promo', 45) },
    ],
  },
  {
    name: 'Pabrai',
    levers: [
      { pillar: 'Clone Score', describe: s => `promoter ${s.promo}% → ≥57.75% (clone ramp top)`, apply: s => withField(s, 'promo', 57.75) },
      { pillar: 'Owner Operator', describe: s => `promoter ${s.promo}% → ≥60% (owner ramp top)`, apply: s => withField(s, 'promo', 60) },
      { pillar: 'Low Risk', describe: s => s.fcf > 0 ? `D/E ${s.de} → 0` : `D/E → 0 AND FCF → positive`, apply: s => withField(withField(s, 'de', 0), 'fcf', Math.max(s.fcf, 1)) },
      { pillar: 'High Uncertainty Discount', describe: s => `P/E ${s.pe} → ≤10`, apply: s => withField(s, 'pe', 10) },
    ],
  },
  {
    name: 'Howard Marks',
    levers: [
      { pillar: 'Cycle Position', describe: s => `D/E ${s.de} → ≤0.5 AND P/E ${s.pe} → ≤20`, apply: s => withField(withField(s, 'de', 0.5), 'pe', 20) },
      { pillar: 'Safety Margin', describe: s => s.roe > 10 ? `FCF → positive` : `FCF → positive AND ROE → >10%`, apply: s => withField(withField(s, 'fcf', 1), 'roe', Math.max(s.roe, 10)) },
      { pillar: 'Asymmetric Payoff', describe: s => `price → ≤1.5× book (price → ${1.5 * s.bvps})`, apply: s => withField(s, 'price', 1.5 * s.bvps) },
      { pillar: 'Market Opp', describe: () => `market cap → into the 1-5 lakh Cr band (→ 300000)`, apply: s => withField(s, 'mktcap', 300000) },
    ],
  },
  {
    name: 'Seth Klarman',
    levers: [
      { pillar: 'Downside Protection', describe: s => `D/E ${s.de} → ≤0.5 AND FCF → positive`, apply: s => withField(withField(s, 'de', 0.5), 'fcf', Math.max(s.fcf, 1)) },
      { pillar: 'Asymmetric', describe: s => `P/E ${s.pe} → ≤15 AND price → ≤1.5× book`, apply: s => withField(withField(s, 'pe', 15), 'price', 1.5 * s.bvps) },
      { pillar: 'Margin Safety', describe: s => `OPM ${s.opm}% → ≥20%`, apply: s => withField(s, 'opm', 20) },
      { pillar: 'Catalyst', describe: s => `revenue CAGR ${s.revcagr}% → ≥12%`, apply: s => withField(s, 'revcagr', 12) },
    ],
  },
  {
    name: 'Soros',
    levers: [
      { pillar: 'Reflexivity Signal', describe: () => `price → ≤1.5× NCAV (positive net current assets)`, apply: s => withField(s, 'ca', s.tl + (s.price * s.sh) / 1.5) },
      { pillar: 'Macro Tailwind', describe: s => `revenue CAGR ${s.revcagr}% → ≥20%`, apply: s => withField(s, 'revcagr', 20) },
      { pillar: 'Momentum Confirm', describe: s => `EPS CAGR ${s.epscagr}% → ≥25%`, apply: s => withField(s, 'epscagr', 25) },
      { pillar: 'Leverage Tolerance', describe: s => `D/E ${s.de} → ≤0.5`, apply: s => withField(s, 'de', 0.5) },
      { pillar: 'Liquidity Buffer', describe: () => `current ratio → ≥2 (ca → 2·tl)`, apply: s => withField(s, 'ca', 2 * Math.max(1, s.tl)) },
    ],
  },
  {
    name: 'John Templeton',
    levers: [
      { pillar: 'Maximum Pessimism', describe: s => `P/E ${s.pe} → ≤10`, apply: s => withField(s, 'pe', 10) },
      { pillar: 'Discount to Book', describe: s => `price → ≤1× book (price → ${s.bvps})`, apply: s => withField(s, 'price', s.bvps) },
      { pillar: 'Contrarian', describe: () => `market cap → ≤1 lakh Cr`, apply: s => withField(s, 'mktcap', 100000) },
      // no lever for the sector-string quality gate: the sector is the
      // company's identity, not a market input the record could change
    ],
  },
  {
    name: 'Walter Schloss',
    levers: [
      { pillar: 'Price to Book', describe: s => `price → ≤1× book (price → ${s.bvps})`, apply: s => withField(s, 'price', s.bvps) },
      { pillar: 'Zero Debt', describe: s => `D/E ${s.de} → ≤0.2`, apply: s => withField(s, 'de', 0.2) },
      { pillar: 'Insider Owner', describe: s => `promoter ${s.promo}% → ≥40%`, apply: s => withField(s, 'promo', 40) },
      { pillar: 'Size', describe: () => `market cap → into the 50k-200k Cr band (→ 100000)`, apply: s => withField(s, 'mktcap', 100000) },
    ],
  },
  {
    name: 'Philip Fisher',
    levers: [
      { pillar: 'Management Quality', describe: s => `promoter ${s.promo}% → ≥50%`, apply: s => withField(s, 'promo', 50) },
      { pillar: 'RandD Investment', describe: s => `capex → ≥8% of revenue (capex → ${0.08 * s.rev})`, apply: s => withField(s, 'capex', 0.08 * s.rev) },
      { pillar: 'Growth Rate', describe: s => `EPS CAGR ${s.epscagr}% → ≥20%`, apply: s => withField(s, 'epscagr', 20) },
      { pillar: 'Market Size', describe: () => `market cap → into the 50k-5 lakh Cr band (→ 100000)`, apply: s => withField(s, 'mktcap', 100000) },
    ],
  },
  {
    name: 'Kacholia',
    levers: [
      { pillar: 'Promoter Skin', describe: s => `promoter ${s.promo}% → ≥50%`, apply: s => withField(s, 'promo', 50) },
      { pillar: 'FCF Acceleration', describe: s => `EPS CAGR ${s.epscagr}% → ≥20.83% (1.2× ≥ 25%)`, apply: s => withField(s, 'epscagr', 25 / 1.2) },
      { pillar: 'Niche ROCE', describe: s => `ROCE ${s.roce}% → ≥20%`, apply: s => withField(s, 'roce', 20) },
      { pillar: 'Small-Cap Size', describe: () => `market cap → into the 200-3000 Cr band (→ 1000)`, apply: s => withField(s, 'mktcap', 1000) },
    ],
  },
  {
    name: 'Kedia',
    levers: [
      { pillar: 'Small (Size)', describe: s => `market cap ${Math.round(s.mktcap)} Cr → ≤5000 Cr`, apply: s => withField(s, 'mktcap', Math.min(s.mktcap, 5000)) },
      { pillar: 'Manageable (Debt)', describe: s => `D/E ${s.de} → ≤0.5`, apply: s => withField(s, 'de', 0.5) },
      { pillar: 'Innovative (Margins)', describe: s => `OPM ${s.opm}% → ≥12%`, apply: s => withField(s, 'opm', 12) },
      { pillar: 'Emerging (Growth)', describe: s => `revenue CAGR ${s.revcagr}% → ≥15%`, apply: s => withField(s, 'revcagr', 15) },
    ],
  },
  {
    name: 'Porinju',
    levers: [
      { pillar: 'Contrarian', describe: s => `P/E ${s.pe} → ≤10`, apply: s => withField(s, 'pe', 10) },
      { pillar: 'Management', describe: s => `promoter ${s.promo}% → ≥65% (management ramp top)`, apply: s => withField(s, 'promo', 65) },
      { pillar: 'Undervaluation', describe: s => s.bvps <= 0 ? `book value → positive (asset backing)` : `price → ≤1× book (price → ${s.bvps})`, apply: s => withField(s, 'bvps', Math.max(s.bvps, 1)) },
      { pillar: 'Catalyst', describe: s => `revenue CAGR ${s.revcagr}% → into the 10-20% sweet band (→ 12%)`, apply: s => withField(s, 'revcagr', 12) },
    ],
  },
  {
    name: 'Raamdeo',
    levers: [
      { pillar: 'Quality', describe: s => `ROCE ${s.roce}% & ROE ${s.roe}% → both ≥20%`, apply: s => withField(withField(s, 'roce', 20), 'roe', 20) },
      { pillar: 'Growth', describe: () => `revenue CAGR → ≥8%, EPS CAGR → ≥9% (both legs cap)`, apply: s => withField(withField(s, 'revcagr', 8), 'epscagr', 9) },
      { pillar: 'Longevity', describe: s => `D/E ${s.de} → ≤0.5`, apply: s => withField(s, 'de', 0.5) },
      { pillar: 'Price', describe: s => `P/E ${s.pe} → ≤25`, apply: s => withField(s, 'pe', 25) },
    ],
  },
  {
    name: 'Basant',
    levers: [
      // no lever for the consumer-sector gate: the sector is the company's
      // identity, not a market input the record could change (same rule as
      // Templeton's quality gate)
      { pillar: 'Revenue Trend', describe: s => `revenue CAGR ${s.revcagr}% → ≥15%`, apply: s => withField(s, 'revcagr', 15) },
      { pillar: 'Margin Visibility', describe: s => `OPM ${s.opm}% → ≥15%`, apply: s => withField(s, 'opm', 15) },
      { pillar: 'Valuation', describe: s => `P/E ${s.pe} → ≤40`, apply: s => withField(s, 'pe', 40) },
    ],
  },
  {
    name: 'Nemish',
    levers: [
      { pillar: 'EPS Consistency', describe: s => `EPS CAGR ${s.epscagr}% → ≥12%`, apply: s => withField(s, 'epscagr', 12) },
      { pillar: 'Debt Free', describe: s => `D/E ${s.de} → ≤0.3`, apply: s => withField(s, 'de', 0.3) },
      { pillar: 'Management', describe: s => `promoter ${s.promo}% → ≥35%`, apply: s => withField(s, 'promo', 35) },
      { pillar: 'Valuation', describe: () => `P/E → ≥25 (a meaningful positive multiple)`, apply: s => withField(s, 'pe', 25) },
    ],
  },
];

export interface CouncilDriver {
  pillar: string;
  v: number;
  detail: string;
}

export interface CouncilChange {
  steps: string[];
}

export interface CouncilRow {
  name: string;
  full: string;
  label: string;
  score: number | null;
  status: 'pass' | 'fail' | 'no-verdict';
  /** pass → strongest drivers first; fail → weakest first; no-verdict → the insufficient pillars. */
  drivers: CouncilDriver[];
  /** fail only: the VERIFIED lever path (each step was re-run and flipped the score);
   *  null when no declared lever combination reaches a pass. */
  change?: CouncilChange | null;
}

export interface CouncilReport {
  symbol: string;
  passBar: number;
  passCount: number;
  failCount: number;
  noVerdictCount: number;
  rows: CouncilRow[];
}

function scorerByName(): Map<string, ScorerFn> {
  // SCORER_REGISTRY[i] produced verdicts[i] (runAllScorers maps in order)
  const map = new Map<string, ScorerFn>();
  const probe: Stock = SCORER_PROBE_STOCK();
  for (const fn of SCORER_REGISTRY) {
    map.set(fn(probe).name, fn);
  }
  return map;
}

let cachedNameMap: Map<string, ScorerFn> | null = null;
function nameMap(): Map<string, ScorerFn> {
  if (cachedNameMap === null) cachedNameMap = scorerByName();
  return cachedNameMap;
}

// Determinism (rule 18): the probe uses a fixed synthetic record — it is
// only read for the scorer's published `name`, never for scores shown.
function SCORER_PROBE_STOCK(): Stock {
  return {
    symbol: 'PROBE', name: 'probe', sector: 'probe', price: 100, mktcap: 10000,
    pe: 10, roe: 10, roce: 10, opm: 10, de: 0.5, promo: 30, np: 100, rev: 1000,
    epscagr: 10, revcagr: 10, fcf: 10, ocf: 100, ca: 200, tl: 100, sh: 10,
    bvps: 10, dep: 10, capex: 10,
  } as Stock;
}

/** Verify one scorer's score on a substituted record (the actual scorer runs). */
function rerun(fn: ScorerFn, s: Stock): number | null {
  return fn(s).score;
}

/** The lever search: single levers first (fewest changes), then the
 *  declared order. Every reported step was VERIFIED by a re-run. */
function findChange(fn: ScorerFn, levers: Lever[], stock: Stock, pillarV: Map<string, number>): CouncilChange | null {
  // 1) single-lever candidates, weakest-pillar-first
  const ordered = [...levers].sort((a, b) => (pillarV.get(a.pillar) ?? 100) - (pillarV.get(b.pillar) ?? 100));
  for (const lever of ordered) {
    const substituted = lever.apply(stock);
    const score = rerun(fn, substituted);
    if (score !== null && score >= COUNCIL_PASS_BAR) {
      return { steps: [lever.describe(stock)] };
    }
  }
  // 2) cumulative saturation in the same (weakest-first) order
  let cur = stock;
  const steps: string[] = [];
  for (const lever of ordered) {
    cur = lever.apply(cur);
    steps.push(lever.describe(stock));
    const score = rerun(fn, cur);
    if (score !== null && score >= COUNCIL_PASS_BAR) {
      return { steps };
    }
  }
  return null; // honest: no declared lever path reaches a pass
}

export function buildCouncil(stock: Stock, verdicts?: RishiScore[]): CouncilReport {
  const scores = verdicts ?? runAllScorers(stock);
  const fns = nameMap();

  const rows: CouncilRow[] = scores.map((v) => {
    const drivers = [...v.comps].map(c => ({ pillar: c.label, v: c.v, detail: c.detail }));
    if (v.score === null) {
      // no-verdict: name the insufficient pillars (their detail says why)
      const insufficient = drivers.filter(d => d.v === 0).slice(0, 3);
      return { name: v.name, full: v.full, label: v.label, score: null, status: 'no-verdict' as const, drivers: insufficient };
    }
    if (v.score >= COUNCIL_PASS_BAR) {
      const strongest = drivers.sort((a, b) => b.v - a.v).slice(0, 2);
      return { name: v.name, full: v.full, label: v.label, score: v.score, status: 'pass' as const, drivers: strongest };
    }
    // fail: weakest drivers first + the verified lever path
    const weakest = drivers.sort((a, b) => a.v - b.v).slice(0, 2);
    const pillarV = new Map(v.comps.map(c => [c.label, c.v]));
    const leverEntry = SCORER_LEVERS.find(l => l.name === v.name);
    const change = leverEntry ? findChange(fns.get(v.name)!, leverEntry.levers, stock, pillarV) : null;
    return { name: v.name, full: v.full, label: v.label, score: v.score, status: 'fail' as const, drivers: weakest, change };
  });

  return {
    symbol: stock.symbol,
    passBar: COUNCIL_PASS_BAR,
    passCount: rows.filter(r => r.status === 'pass').length,
    failCount: rows.filter(r => r.status === 'fail').length,
    noVerdictCount: rows.filter(r => r.status === 'no-verdict').length,
    rows,
  };
}
