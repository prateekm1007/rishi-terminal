import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';
import type { ScoringContext } from '../consensus/orchestrator';
import { licenseRefusal, SCORER_VERDICT_CONTRACT, noVerdictScore, observed, sectorRefusal, unknownAmong } from './verdictGuards';

export function scoreRaamdeo(input: Stock, ctx?: ScoringContext): RishiScore {
  // P0-3 (founder audit 2026-10-11): THE SECTOR GATE — a lender row is
  // never scored on the metrics its sector does not have (D/E, OPM,
  // FCF, P/NCAV, current ratio); Greenblatt refuses lenders entirely.
  const p03Refusal = sectorRefusal(input, "Raamdeo");
  if (p03Refusal) return p03Refusal;

  // P0-2 (founder audit 2026-10-11): a placeholder zero in a required
  // field is UNKNOWN — no verdict, never an interpretation of zero.
  const p02Missing = unknownAmong(input, SCORER_VERDICT_CONTRACT["Raamdeo"].required, ctx);
  if (p02Missing.length) return noVerdictScore(SCORER_VERDICT_CONTRACT["Raamdeo"], p02Missing);
  // P0-8 (founder directive 2026-10-11): the price-license gate — the
  // LAST refusal before the arithmetic. While the exchange-data license
  // is pending, a price-based framework does not publish verdicts.
  const p08Refusal = licenseRefusal("Raamdeo");
  if (p08Refusal) return p08Refusal;
  // P0-2b: the guard proved every required field observed — lift the
  // nullable classes to their observed types for the arithmetic below.
  const s = observed(input);

  // S2-05 (Round 13): this was the ONLY unclamped pillar in the scorer
  // panel — a negative ROCE/ROE drove Quality below 0 (CHEMPLASTS -60,
  // PVRINOX -35 on the 916 seed), dragging the verdict below the design
  // floor. Every other pillar in lib/scorers wraps its ramp in clamp();
  // the QGLP composite is a 0-100 pillar like the rest. Caught by the
  // explainability gate (test/scoring.explain.test.ts: pillar v must be
  // in [0,100]) — the breakdown now published had to match the arithmetic,
  // and the arithmetic was wrong.
  const qualityScore = clamp((s.roce >= 20 ? 100 : s.roce * 5) * 0.5 + (s.roe >= 20 ? 100 : s.roe * 5) * 0.5);
  const growthScore = clamp(Math.min(50, s.revcagr * 6.25) + Math.min(50, s.epscagr * 5.56));
  const longevityScore = s.de <= 0.5 ? 100 : s.de <= 1.5 ? 70 : clamp(100 - s.de * 40);
  const priceScore = s.pe <= 25 ? 100 : s.pe <= 40 ? 60 : clamp(100 - (s.pe - 40) * 2);
  const total = qualityScore * 0.30 + growthScore * 0.25 + longevityScore * 0.25 + priceScore * 0.20;
  return { name: 'Raamdeo', full: 'Raamdeo Agrawal', label: 'QGLP Framework', score: Math.round(total), scoreRaw: total, origin: 'Bharat', comps: [ { label: 'Quality', v: qualityScore, wt: 30, detail: `ROCE ${s.roce}% ROE ${s.roe}%` }, { label: 'Growth', v: growthScore, wt: 25, detail: `${s.revcagr}% rev` }, { label: 'Longevity', v: longevityScore, wt: 25, detail: `D/E ${s.de}` }, { label: 'Price', v: priceScore, wt: 20, detail: `P/E ${s.pe}` } ], insight: `QGLP score ${Math.round(total)}. ${total >= 75 ? 'Excellent compounder' : 'Check factors'}` };
}