import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';
import type { ScoringContext } from '../consensus/orchestrator';
import { SCORER_VERDICT_CONTRACT, noVerdictScore, observed, sectorRefusal, unknownAmong } from './verdictGuards';

export function scoreKedia(input: Stock, ctx?: ScoringContext): RishiScore {
  // P0-3 (founder audit 2026-10-11): THE SECTOR GATE — a lender row is
  // never scored on the metrics its sector does not have (D/E, OPM,
  // FCF, P/NCAV, current ratio); Greenblatt refuses lenders entirely.
  const p03Refusal = sectorRefusal(input, "Kedia");
  if (p03Refusal) return p03Refusal;

  // P0-2 (founder audit 2026-10-11): a placeholder zero in a required
  // field is UNKNOWN — no verdict, never an interpretation of zero.
  const p02Missing = unknownAmong(input, SCORER_VERDICT_CONTRACT["Kedia"].required, ctx);
  if (p02Missing.length) return noVerdictScore(SCORER_VERDICT_CONTRACT["Kedia"], p02Missing);
  // P0-2b: the guard proved every required field observed — lift the
  // nullable classes to their observed types for the arithmetic below.
  const s = observed(input);

  const smallS = s.mktcap <= 5000 ? 100 : clamp(100 - (s.mktcap - 5000) / 100);
  const manageableS = s.de <= 0.5 ? 100 : clamp(100 - s.de * 100);
  const innovS = clamp(s.opm >= 12 ? 100 : s.opm * 8.33);
  const emergingS = clamp(s.revcagr >= 15 ? 100 : s.revcagr * 6.67);
  const total = smallS * 0.20 + manageableS * 0.20 + innovS * 0.20 + emergingS * 0.20 + 50 * 0.20;
  return {
    name: 'Kedia', full: 'Vijay Kedia', label: 'SMILE Formula',
    score: Math.round(total), scoreRaw: total, origin: 'Bharat',
    comps: [
      { label: 'Small (Size)', v: smallS, wt: 20, detail: `${Math.round(s.mktcap)}Cr target <5000Cr` },
      { label: 'Manageable (Debt)', v: manageableS, wt: 20, detail: `D/E ${s.de.toFixed(2)} target <0.5` },
      { label: 'Innovative (Margins)', v: innovS, wt: 20, detail: `OPM ${s.opm}% target >12%` },
      { label: 'Emerging (Growth)', v: emergingS, wt: 20, detail: `Rev CAGR ${s.revcagr}% target >15%` },
      { label: 'Neutral Base', v: 50, wt: 20, detail: 'design constant — the SMILE formula holds a neutral 50 at 20% weight (S2-05: published, not hidden)' },
    ],
    insight: `SMILE: Size ${Math.round(s.mktcap)}Cr · Debt ${s.de.toFixed(2)} · Margins ${s.opm}% · Growth ${s.revcagr}%. ${total >= 70 ? 'Classic SMILE fit!' : 'Lacks SMILE charm.'}`
  };
}
