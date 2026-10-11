import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';
import type { ScoringContext } from '../consensus/orchestrator';
import { inputMissing, insuffDetail } from './unknownInputs';

/**
 * W4 (founder round-10) saturation fix: three of four components were
 * flat 100 inside pass regions most of the universe occupies (field
 * profile: P/E <= 15 for 18%, P/B < 2.5 for 49%, promoter >= 40 for
 * 86%), so 23.8% of stocks scored >= 95.
 *
 * Criteria and directions unchanged (Porinju's contrarian deep value:
 * hated prices, honest management, asset backing, a growth catalyst) —
 * each component now grades WITHIN the pass region:
 *   - Contrarian: 100 at P/E <= 10 → 0 at 60 (was flat 100 <= 15)
 *   - Management: 0 at promoter 25% → 100 at 65% (was flat 100 >= 40)
 *   - Undervaluation: 100 at P/B <= 1 → 0 at 4 (was flat 100 < 2.5)
 *   - Catalyst: the growth sweet-spot shape is kept (turnarounds need
 *     SOME growth; overheated >= 20% growth still reads as less of a
 *     contrarian entry), graded at the same bands.
 *
 * P0-2 (founder audit 2026-10-11): a required pillar input that was
 * never observed (null / seed placeholder zero / non-positive P/E)
 * yields `score: null` — no verdict. Observed-data arithmetic unchanged.
 */
export function scorePorinju(s: Stock, ctx?: ScoringContext): RishiScore {
  const peUnknown = inputMissing(s, ctx, 'pe');
  const promoUnknown = inputMissing(s, ctx, 'promo');
  const bvpsUnknown = inputMissing(s, ctx, 'bvps');
  const revcagrUnknown = inputMissing(s, ctx, 'revcagr');
  const insufficient = peUnknown || promoUnknown || bvpsUnknown || revcagrUnknown;

  const contraryScore = peUnknown ? null : clamp(100 - Math.max(0, s.pe! - 10) * 2);
  const mgmtScore = promoUnknown ? null : clamp((s.promo - 25) * 2.5);
  // Undervaluation: P/B needs a POSITIVE book. bvps <= 0 means no asset
  // backing exists — the component's premise (a discount to book) does
  // not exist, so it scores 0 and the detail SAYS so (rule 3: never a
  // fabricated ratio; the old Math.max(1, bvps) floor displayed
  // "P/B <price>x" for a negative-book company and the pre-W4 ladder
  // scored such rows 100). Measured incidence on the 916 seed: 0 rows —
  // this branch is correctness-by-construction, pinned by
  // test/scorerBoundaries.test.ts.
  let undervalScore: number | null;
  let undervalDetail: string;
  if (bvpsUnknown) {
    undervalScore = null;
    undervalDetail = insuffDetail('book value');
  } else if (s.bvps <= 0) {
    undervalScore = 0;
    undervalDetail = 'Book value <= 0 — no asset backing (P/B not computable)';
  } else {
    const pb = s.price / s.bvps;
    undervalScore = clamp(100 - Math.max(0, pb - 1) * (100 / 3));
    undervalDetail = `P/B ${pb.toFixed(1)}x`;
  }
  const catalystScore = revcagrUnknown ? null : s.revcagr >= 20 ? 80 : s.revcagr >= 10 ? 100 : clamp(s.revcagr * 10);
  const total = insufficient
    ? null
    : contraryScore! * 0.30 + mgmtScore! * 0.25 + undervalScore! * 0.25 + catalystScore! * 0.20;
  return { name: 'Porinju', full: 'Porinju Veliyath', label: 'Contrarian Deep Value',
    score: total === null ? null : Math.round(total), scoreRaw: total, origin: 'Bharat',
    comps: [
      { label: 'Contrarian', v: contraryScore === null ? 0 : contraryScore, wt: 30, detail: peUnknown ? insuffDetail('valuation (no meaningful P/E)') : `P/E ${s.pe}` },
      { label: 'Management', v: mgmtScore === null ? 0 : mgmtScore, wt: 25, detail: promoUnknown ? insuffDetail('promoter holding') : `${s.promo}%` },
      { label: 'Undervaluation', v: undervalScore === null ? 0 : undervalScore, wt: 25, detail: undervalDetail },
      { label: 'Catalyst', v: catalystScore === null ? 0 : catalystScore, wt: 20, detail: revcagrUnknown ? insuffDetail('revenue growth') : `Rev ${s.revcagr}%` },
    ],
    insight: insufficient
      ? 'Insufficient data — placeholder or missing inputs in the Contrarian Deep Value pillars (P/E / promoter holding / book value / growth), no Porinju verdict.'
      : `P/E ${s.pe} dot Book ${s.bvps > 0 ? (s.price / s.bvps).toFixed(1) + 'x' : 'n/a (book <= 0)'}. ${total! >= 75 ? 'Turnaround candidate' : 'Waiting'}` };
}
