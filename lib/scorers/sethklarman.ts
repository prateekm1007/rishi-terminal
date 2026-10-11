import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';
import type { ScoringContext } from '../consensus/orchestrator';
import { licenseRefusal, SCORER_VERDICT_CONTRACT, noVerdictScore, observed, sectorRefusal, unknownAmong } from './verdictGuards';

export function scoreSethKlarman(input: Stock, ctx?: ScoringContext): RishiScore {
  // P0-3 (founder audit 2026-10-11): THE SECTOR GATE — a lender row is
  // never scored on the metrics its sector does not have (D/E, OPM,
  // FCF, P/NCAV, current ratio); Greenblatt refuses lenders entirely.
  const p03Refusal = sectorRefusal(input, "Seth Klarman");
  if (p03Refusal) return p03Refusal;

  // P0-2 (founder audit 2026-10-11): a placeholder zero in a required
  // field is UNKNOWN — no verdict, never an interpretation of zero.
  const p02Missing = unknownAmong(input, SCORER_VERDICT_CONTRACT["Seth Klarman"].required, ctx);
  if (p02Missing.length) return noVerdictScore(SCORER_VERDICT_CONTRACT["Seth Klarman"], p02Missing);
  // P0-8 (founder directive 2026-10-11): the price-license gate — the
  // LAST refusal before the arithmetic. While the exchange-data license
  // is pending, a price-based framework does not publish verdicts.
  const p08Refusal = licenseRefusal("Seth Klarman");
  if (p08Refusal) return p08Refusal;
  // P0-2b: the guard proved every required field observed — lift the
  // nullable classes to their observed types for the arithmetic below.
  const s = observed(input);

  const downsideScore = s.de <= 0.5 && s.fcf > 0 ? 100 : s.de > 2 || s.fcf <= 0 ? 20 : clamp(50 + (s.de <= 1 ? 25 : 0) + (s.fcf > 0 ? 25 : 0));
  const asymmetricScore = s.pe <= 15 && s.price <= s.bvps * 1.5 ? 100 : s.pe > 40 || s.price > s.bvps * 3 ? 20 : clamp(50 + (s.pe <= 25 ? 25 : 0) + (s.price <= s.bvps * 2 ? 25 : 0));
  const marginScore = s.opm >= 20 ? 100 : clamp(s.opm * 5);
  const catalystScore = s.revcagr >= 12 ? 100 : clamp(s.revcagr * 8.33);
  const total = downsideScore * 0.40 + asymmetricScore * 0.30 + marginScore * 0.15 + catalystScore * 0.15;
  return { name: 'Seth Klarman', full: 'Seth Klarman', label: 'Asymmetric Safety', score: Math.round(total), scoreRaw: total, origin: 'Global', comps: [ { label: 'Downside Protection', v: downsideScore, wt: 40, detail: `Debt ${s.de}` }, { label: 'Asymmetric', v: asymmetricScore, wt: 30, detail: `P/E ${s.pe}` }, { label: 'Margin Safety', v: marginScore, wt: 15, detail: `OPM ${s.opm}%` }, { label: 'Catalyst', v: catalystScore, wt: 15, detail: `Growth ${s.revcagr}%` } ], insight: `Conservative value. ${total >= 75 ? 'Margin excellent' : 'Risk present'}` };
}