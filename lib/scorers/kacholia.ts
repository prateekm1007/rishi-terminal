import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';
import type { ScoringContext } from '../consensus/orchestrator';
import { licenseRefusal, SCORER_VERDICT_CONTRACT, noVerdictScore, observed, sectorRefusal, unknownAmong } from './verdictGuards';

export function scoreKacholia(input: Stock, ctx?: ScoringContext): RishiScore {
  // P0-3 (founder audit 2026-10-11): THE SECTOR GATE — a lender row is
  // never scored on the metrics its sector does not have (D/E, OPM,
  // FCF, P/NCAV, current ratio); Greenblatt refuses lenders entirely.
  const p03Refusal = sectorRefusal(input, "Kacholia");
  if (p03Refusal) return p03Refusal;

  // P0-2 (founder audit 2026-10-11): a placeholder zero in a required
  // field is UNKNOWN — no verdict, never an interpretation of zero.
  const p02Missing = unknownAmong(input, SCORER_VERDICT_CONTRACT["Kacholia"].required, ctx);
  if (p02Missing.length) return noVerdictScore(SCORER_VERDICT_CONTRACT["Kacholia"], p02Missing);
  // P0-8 (founder directive 2026-10-11): the price-license gate — the
  // LAST refusal before the arithmetic. While the exchange-data license
  // is pending, a price-based framework does not publish verdicts.
  const p08Refusal = licenseRefusal("Kacholia");
  if (p08Refusal) return p08Refusal;
  // P0-2b: the guard proved every required field observed — lift the
  // nullable classes to their observed types for the arithmetic below.
  const s = observed(input);

  const skinS = clamp(s.promo >= 50 ? 100 : s.promo * 2);
  const fcfGrowth = s.epscagr * 1.2;
  const fcfS = clamp(fcfGrowth >= 25 ? 100 : fcfGrowth * 4);
  const sizeS = s.mktcap >= 200 && s.mktcap <= 3000 ? 100 : s.mktcap < 200 ? 50 : clamp(100 - (s.mktcap - 3000) / 100);
  const nicheS = clamp(s.roce >= 20 ? 100 : s.roce * 5);
  const total = skinS * 0.30 + fcfS * 0.25 + nicheS * 0.20 + sizeS * 0.15 + 50 * 0.10;
  return {
    name: 'Kacholia', full: 'Ashish Kacholia', label: 'Whale Small-Cap Hunter',
    score: Math.round(total), scoreRaw: total, origin: 'Bharat',
    comps: [
      { label: 'Promoter Skin', v: skinS, wt: 30, detail: `${s.promo}% holding target >50%` },
      { label: 'FCF Acceleration', v: fcfS, wt: 25, detail: `${fcfGrowth.toFixed(1)}% growth target >25%` },
      { label: 'Niche ROCE', v: nicheS, wt: 20, detail: `ROCE ${s.roce}% target >20%` },
      { label: 'Small-Cap Size', v: sizeS, wt: 15, detail: `${Math.round(s.mktcap)}Cr (sweet spot 200-3000Cr)` },
      { label: 'Neutral Base', v: 50, wt: 10, detail: 'design constant — the scorer holds a neutral 50 at 10% weight (S2-05: published, not hidden)' },
    ],
    insight: `${Math.round(s.mktcap)}Cr mktcap · ${s.promo}% promoter · ROCE ${s.roce}%. ${s.mktcap >= 200 && s.mktcap <= 3000 && s.promo >= 50 ? 'Kacholia sweet spot!' : 'Outside hunting zone.'}`
  };
}
