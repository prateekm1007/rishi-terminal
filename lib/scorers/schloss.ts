import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';
import type { ScoringContext } from '../consensus/orchestrator';
import { licenseRefusal, SCORER_VERDICT_CONTRACT, noVerdictScore, observed, sectorRefusal, unknownAmong } from './verdictGuards';

export function scoreWalterSchloss(input: Stock, ctx?: ScoringContext): RishiScore {
  // P0-3 (founder audit 2026-10-11): THE SECTOR GATE — a lender row is
  // never scored on the metrics its sector does not have (D/E, OPM,
  // FCF, P/NCAV, current ratio); Greenblatt refuses lenders entirely.
  const p03Refusal = sectorRefusal(input, "Walter Schloss");
  if (p03Refusal) return p03Refusal;

  // P0-2 (founder audit 2026-10-11): a placeholder zero in a required
  // field is UNKNOWN — no verdict, never an interpretation of zero.
  const p02Missing = unknownAmong(input, SCORER_VERDICT_CONTRACT["Walter Schloss"].required, ctx);
  if (p02Missing.length) return noVerdictScore(SCORER_VERDICT_CONTRACT["Walter Schloss"], p02Missing);
  // P0-8 (founder directive 2026-10-11): the price-license gate — the
  // LAST refusal before the arithmetic. While the exchange-data license
  // is pending, a price-based framework does not publish verdicts.
  const p08Refusal = licenseRefusal("Walter Schloss");
  if (p08Refusal) return p08Refusal;
  // P0-2b: the guard proved every required field observed — lift the
  // nullable classes to their observed types for the arithmetic below.
  const s = observed(input);

  const pbScore = s.price <= s.bvps ? 100 : s.price <= s.bvps * 1.3 ? 80 : clamp(100 - (s.price / s.bvps - 1.3) * 100);
  const debtScore = s.de <= 0.2 ? 100 : s.de <= 0.5 ? 80 : clamp(100 - s.de * 100);
  const insiderScore = s.promo >= 40 ? 100 : clamp(s.promo * 2.5);
  const diversityScore = s.mktcap >= 50000 && s.mktcap <= 200000 ? 100 : clamp(50 + (s.mktcap >= 30000 ? 25 : 0) + (s.mktcap <= 300000 ? 25 : 0));
  const total = pbScore * 0.40 + debtScore * 0.30 + insiderScore * 0.20 + diversityScore * 0.10;
  return { name: 'Walter Schloss', full: 'Walter Schloss', label: 'Cigar Butt', score: Math.round(total), scoreRaw: total, origin: 'Global', comps: [ { label: 'Price to Book', v: pbScore, wt: 40, detail: `P/B ${(s.price/s.bvps).toFixed(1)}x` }, { label: 'Zero Debt', v: debtScore, wt: 30, detail: `D/E ${s.de}` }, { label: 'Insider Owner', v: insiderScore, wt: 20, detail: `${s.promo}%` }, { label: 'Size', v: diversityScore, wt: 10, detail: `Mktcap good` } ], insight: `Cigar butt. P/B ${(s.price/s.bvps).toFixed(1)}x. ${total >= 75 ? 'Squeeze profits' : 'Not a butt'}` };
}