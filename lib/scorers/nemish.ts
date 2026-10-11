import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';
import type { ScoringContext } from '../consensus/orchestrator';
import { insuffDetail } from './unknownInputs';
import { licenseRefusal, sectorRefusal } from './verdictGuards';

/**
 * Nemish Shah — Steady Compounder (X6, Round 13 root-cause fix).
 *
 * Four pillars: EPS Consistency (35%) + Debt Free (30%) + Management (20%)
 * + Valuation (15%). The arithmetic on OBSERVED data is unchanged from the
 * pre-fix scorer (thresholds are not re-tuned — the W4 direction forbids
 * cosmetic re-tuning); what changed is the treatment of data nobody
 * observed:
 *
 * A seed-sourced 0 is the June placeholder for UNKNOWN (the Y4 contract),
 * not an observation. Before X6 this scorer read `de: 0` as "perfectly
 * debt-free" (100 points on 145 stocks whose D/E nobody knows — including
 * every bank placeholder) and `pe: 0` as "ultra-cheap" (100 points on 73
 * stocks with no meaningful P/E). It NEVER returned null — on a fully
 * unknown record it still returned a finite 45 built from two
 * placeholder-perfect pillars, and it was the most saturated scorer in the
 * panel (mean 87.5, 18.8% of the universe at >= 95) precisely because
 * unknowns scored as perfect.
 *
 * Now a pillar whose input is a placeholder unknown is INSUFFICIENT, and a
 * four-pillar verdict with a missing pillar is null ("insufficient data")
 * — the same T11 semantics as Damani/Jhunjhunwala. A LIVE-sourced 0 is a
 * real observation (G5: a genuinely debt-free company has D/E = 0) and
 * still scores; the scoring context carries that provenance.
 *
 * P/E <= 0 is insufficient regardless of provenance: a live P/E must be
 * strictly positive to be admissible (G5 — 0/negative is the provider
 * sentinel for "no meaningful earnings"), and a seed 0 is the placeholder.
 * There is no input set in which a zero P/E is a valuation observation.
 *
 * Negative observations are REAL and score: an EPS CAGR of -8% earns 0
 * consistency points (a downturn is an observation of a downturn, not
 * missing data).
 */
export function scoreNemish(s: Stock, ctx?: ScoringContext): RishiScore {
  // P0-3 (founder audit 2026-10-11): THE SECTOR GATE — a lender row is
  // never scored on the metrics its sector does not have (D/E, OPM,
  // FCF, P/NCAV, current ratio); Greenblatt refuses lenders entirely.
  const p03Refusal = sectorRefusal(s, "Nemish");
  if (p03Refusal) return p03Refusal;

  // A pillar input is a placeholder unknown when it is the seed's 0 (the
  // context decides — no context means seed semantics, the fail-closed
  // default) or, for P/E, when no meaningful P/E exists at all.
  const isUnknown = (field: 'epscagr' | 'de' | 'promo' | 'pe'): boolean => {
    // P0-2: the data-layer null (never observed) is missing regardless
    // of provenance; the pe rule is unchanged (no input set in which a
    // zero/negative P/E is a valuation observation).
    if (field === 'pe') return s.pe === null || s.pe <= 0;
    const v = s[field];
    if (v === null) return true;
    return v === 0 && (ctx ? ctx.unknownFields.has(field) : true);
  };

  const epsUnknown = isUnknown('epscagr');
  const deUnknown = isUnknown('de');
  const promoUnknown = isUnknown('promo');
  const peUnknown = isUnknown('pe');
  const insufficient =
    epsUnknown || deUnknown || promoUnknown || peUnknown;
  // P0-8 (founder directive 2026-10-11): the price-license gate — the
  // LAST refusal before the arithmetic. While the exchange-data license
  // is pending, a price-based framework does not publish verdicts.
  if (!insufficient) {
    const p08Refusal = licenseRefusal("Nemish");
    if (p08Refusal) return p08Refusal;
  }

  const consistencyScore = s.epscagr >= 12 ? 100 : clamp(s.epscagr * 8.33);
  const debtScore = s.de === null ? 0 : s.de <= 0.3 ? 100 : s.de <= 0.6 ? 80 : clamp(100 - s.de * 100);
  const mgmtScore = s.promo >= 35 ? 100 : clamp(s.promo * 2.86);
  // (valueScore is only reached when peUnknown is false — a meaningful P/E exists.)
  const valueScore = s.pe === null ? 0 : s.pe <= 25 ? 100 : s.pe <= 35 ? 70 : clamp(100 - (s.pe - 35) * 3);
  const total = consistencyScore * 0.35 + debtScore * 0.30 + mgmtScore * 0.20 + valueScore * 0.15;

  return {
    name: 'Nemish', full: 'Nemish Shah', label: 'Steady Compounder',
    score: insufficient ? null : Math.round(total),
    scoreRaw: insufficient ? null : total,
    origin: 'Bharat',
    comps: [
      { label: 'EPS Consistency', v: epsUnknown ? 0 : consistencyScore, wt: 35, detail: epsUnknown ? insuffDetail('EPS growth') : `${s.epscagr}%` },
      { label: 'Debt Free', v: deUnknown ? 0 : debtScore, wt: 30, detail: deUnknown ? insuffDetail('debt (D/E)') : `D/E ${s.de}` },
      { label: 'Management', v: promoUnknown ? 0 : mgmtScore, wt: 20, detail: promoUnknown ? insuffDetail('promoter holding') : `${s.promo}%` },
      { label: 'Valuation', v: peUnknown ? 0 : valueScore, wt: 15, detail: peUnknown ? insuffDetail('valuation (no meaningful P/E)') : `P/E ${s.pe}` },
    ],
    insight: insufficient
      ? 'Insufficient data \u2014 placeholder zeros in the Steady Compounder pillars (EPS growth / debt / management / valuation), no verdict.'
      : `Boring steady. EPS ${s.epscagr}% \u00b7 Debt ${s.de} \u00b7 P/E ${s.pe}. ${total >= 75 ? 'Long term hold' : 'Not ready'}`,
  };
}
