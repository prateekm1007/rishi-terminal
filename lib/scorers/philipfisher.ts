import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';
import type { ScoringContext } from '../consensus/orchestrator';
import { licenseRefusal, SCORER_VERDICT_CONTRACT, noVerdictScore, observed, sectorRefusal, unknownAmong } from './verdictGuards';

export function scorePhilipFisher(input: Stock, ctx?: ScoringContext): RishiScore {
  // P0-3 (founder audit 2026-10-11): THE SECTOR GATE — a lender row is
  // never scored on the metrics its sector does not have (D/E, OPM,
  // FCF, P/NCAV, current ratio); Greenblatt refuses lenders entirely.
  const p03Refusal = sectorRefusal(input, "Philip Fisher");
  if (p03Refusal) return p03Refusal;

  // P0-2 (founder audit 2026-10-11): a placeholder zero in a required
  // field is UNKNOWN — no verdict, never an interpretation of zero.
  const p02Missing = unknownAmong(input, SCORER_VERDICT_CONTRACT["Philip Fisher"].required, ctx);
  if (p02Missing.length) return noVerdictScore(SCORER_VERDICT_CONTRACT["Philip Fisher"], p02Missing);
  // P0-8 (founder directive 2026-10-11): the price-license gate — the
  // LAST refusal before the arithmetic. While the exchange-data license
  // is pending, a price-based framework does not publish verdicts.
  const p08Refusal = licenseRefusal("Philip Fisher");
  if (p08Refusal) return p08Refusal;
  // P0-2b: the guard proved every required field observed — lift the
  // nullable classes to their observed types for the arithmetic below.
  const s = observed(input);

  const mgmtScore = s.promo >= 50 ? 100 : clamp(s.promo * 2);
  const rndScore = s.capex >= s.rev * 0.08 ? 100 : clamp((s.capex / s.rev) * 100 * 12.5);
  const growthScore = s.epscagr >= 20 ? 100 : clamp(s.epscagr * 5);
  const marketScore = s.mktcap >= 50000 && s.mktcap <= 500000 ? 100 : s.mktcap < 50000 ? 70 : clamp(100 - (s.mktcap - 500000) / 100000);
  const total = mgmtScore * 0.25 + rndScore * 0.25 + growthScore * 0.25 + marketScore * 0.25;
  return { name: 'Philip Fisher', full: 'Philip Fisher', label: 'Scuttlebutt Growth', score: Math.round(total), scoreRaw: total, origin: 'Global', comps: [ { label: 'Management Quality', v: mgmtScore, wt: 25, detail: `Insider ${s.promo}%` }, { label: 'RandD Investment', v: rndScore, wt: 25, detail: `Capex ${((s.capex/s.rev)*100).toFixed(1)}%` }, { label: 'Growth Rate', v: growthScore, wt: 25, detail: `EPS CAGR ${s.epscagr}%` }, { label: 'Market Size', v: marketScore, wt: 25, detail: `Mktcap Rs${Math.round(s.mktcap/1000)}K` } ], insight: `Growth compounder. Mgmt ${s.promo}%. ${total >= 75 ? 'Buy signal' : 'Research more'}` };
}