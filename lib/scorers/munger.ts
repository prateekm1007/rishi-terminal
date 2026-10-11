import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';
import type { ScoringContext } from '../consensus/orchestrator';
import { licenseRefusal, SCORER_VERDICT_CONTRACT, noVerdictScore, observed, sectorRefusal, unknownAmong } from './verdictGuards';

export function scoreMunger(input: Stock, ctx?: ScoringContext): RishiScore {
  // P0-3 (founder audit 2026-10-11): THE SECTOR GATE — a lender row is
  // never scored on the metrics its sector does not have (D/E, OPM,
  // FCF, P/NCAV, current ratio); Greenblatt refuses lenders entirely.
  const p03Refusal = sectorRefusal(input, "Munger");
  if (p03Refusal) return p03Refusal;

  // P0-2 (founder audit 2026-10-11): a placeholder zero in a required
  // field is UNKNOWN — no verdict, never an interpretation of zero.
  const p02Missing = unknownAmong(input, SCORER_VERDICT_CONTRACT["Munger"].required, ctx);
  if (p02Missing.length) return noVerdictScore(SCORER_VERDICT_CONTRACT["Munger"], p02Missing);
  // P0-8 (founder directive 2026-10-11): the price-license gate — the
  // LAST refusal before the arithmetic. While the exchange-data license
  // is pending, a price-based framework does not publish verdicts.
  const p08Refusal = licenseRefusal("Munger");
  if (p08Refusal) return p08Refusal;
  // P0-2b: the guard proved every required field observed — lift the
  // nullable classes to their observed types for the arithmetic below.
  const s = observed(input);

  const circleS = s.roce >= 25 && s.de <= 0.5 ? 100 : clamp((s.roce * 2) + (s.de <= 0.5 ? 50 : 0));
  // P1-MUNGER (founder audit 2026-10-11): the Inversion Check defaults to
  // NOT ASSESSED, never to a clearance. The old arithmetic awarded the
  // full 100 — an all-clear detail string — whenever D/E and the FCF sign
  // stayed clean, asserting a forensic clearance that no forensic data
  // backs (the pipeline observes no accounting flags, related-party
  // percentages or auditor notes for any record). The two OBSERVED screens
  // still bite (high debt or negative FCF -> 0); without them and without
  // forensic data the pillar holds the neutral 50 under its honest label.
  const inversionS = s.de > 2 || s.fcf < 0 ? 0 : 50;
  const inversionDetail =
    s.de > 2 ? 'FAIL: High debt'
    : s.fcf < 0 ? 'FAIL: Negative FCF'
    : 'NOT ASSESSED — no forensic screens observed (accounting flags, related-party, auditor notes pending)';
  const lollaS = clamp(s.roe >= 20 && s.roce >= 20 ? 100 : (s.roe + s.roce) * 2);
  const patienceS = s.promo >= 40 ? 100 : clamp(s.promo * 2.5);
  const total = circleS * 0.30 + inversionS * 0.25 + lollaS * 0.25 + patienceS * 0.20;
  return {
    name: 'Munger', full: 'Charlie Munger', label: 'Mental Models',
    score: Math.round(total), scoreRaw: total, origin: 'Global',
    comps: [
      { label: 'Circle of Competence', v: circleS, wt: 30, detail: `ROCE ${s.roce}% · D/E ${s.de.toFixed(2)}` },
      { label: 'Inversion Check', v: inversionS, wt: 25, detail: inversionDetail },
      { label: 'Lollapalooza Effect', v: lollaS, wt: 25, detail: `ROE ${s.roe}% + ROCE ${s.roce}% convergence` },
      { label: 'Patience Filter', v: patienceS, wt: 20, detail: `Promoter ${s.promo}% commitment` },
    ],
    insight: `ROCE ${s.roce}% · ROE ${s.roe}% · D/E ${s.de.toFixed(2)}. ${inversionS === 0 ? 'Fails the inversion test — the failure modes are visible.' : total >= 75 ? 'Wonderful business to own forever.' : 'Too complex or mediocre.'}`
  };
}
