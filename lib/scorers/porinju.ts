import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';

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
 */
export function scorePorinju(s: Stock): RishiScore {
  const contraryScore = clamp(100 - Math.max(0, s.pe - 10) * 2);
  const mgmtScore = clamp((s.promo - 25) * 2.5);
  // Undervaluation: P/B needs a POSITIVE book. bvps <= 0 means no asset
  // backing exists — the component's premise (a discount to book) does
  // not exist, so it scores 0 and the detail SAYS so (rule 3: never a
  // fabricated ratio; the old Math.max(1, bvps) floor displayed
  // "P/B <price>x" for a negative-book company and the pre-W4 ladder
  // scored such rows 100). Measured incidence on the 916 seed: 0 rows —
  // this branch is correctness-by-construction, pinned by
  // test/scorerBoundaries.test.ts.
  let undervalScore: number;
  let undervalDetail: string;
  if (s.bvps <= 0) {
    undervalScore = 0;
    undervalDetail = 'Book value <= 0 — no asset backing (P/B not computable)';
  } else {
    const pb = s.price / s.bvps;
    undervalScore = clamp(100 - Math.max(0, pb - 1) * (100 / 3));
    undervalDetail = `P/B ${pb.toFixed(1)}x`;
  }
  const catalystScore = s.revcagr >= 20 ? 80 : s.revcagr >= 10 ? 100 : clamp(s.revcagr * 10);
  const total = contraryScore * 0.30 + mgmtScore * 0.25 + undervalScore * 0.25 + catalystScore * 0.20;
  return { name: 'Porinju', full: 'Porinju Veliyath', label: 'Contrarian Deep Value', score: Math.round(total), scoreRaw: total, origin: 'Bharat', comps: [ { label: 'Contrarian', v: contraryScore, wt: 30, detail: `P/E ${s.pe}` }, { label: 'Management', v: mgmtScore, wt: 25, detail: `${s.promo}%` }, { label: 'Undervaluation', v: undervalScore, wt: 25, detail: undervalDetail }, { label: 'Catalyst', v: catalystScore, wt: 20, detail: `Rev ${s.revcagr}%` } ], insight: `P/E ${s.pe} dot Book ${s.bvps > 0 ? (s.price / s.bvps).toFixed(1) + 'x' : 'n/a (book <= 0)'}. ${total >= 75 ? 'Turnaround candidate' : 'Waiting'}` };
}
