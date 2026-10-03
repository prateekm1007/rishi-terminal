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
  const pb = s.price / Math.max(1, s.bvps);
  const contraryScore = clamp(100 - Math.max(0, s.pe - 10) * 2);
  const mgmtScore = clamp((s.promo - 25) * 2.5);
  const undervalScore = clamp(100 - Math.max(0, pb - 1) * (100 / 3));
  const catalystScore = s.revcagr >= 20 ? 80 : s.revcagr >= 10 ? 100 : clamp(s.revcagr * 10);
  const total = contraryScore * 0.30 + mgmtScore * 0.25 + undervalScore * 0.25 + catalystScore * 0.20;
  return { name: 'Porinju', full: 'Porinju Veliyath', label: 'Contrarian Deep Value', score: Math.round(total), origin: 'Bharat', comps: [ { label: 'Contrarian', v: Math.round(contraryScore), wt: 30, detail: `P/E ${s.pe}` }, { label: 'Management', v: Math.round(mgmtScore), wt: 25, detail: `${s.promo}%` }, { label: 'Undervaluation', v: Math.round(undervalScore), wt: 25, detail: `P/B ${pb.toFixed(1)}x` }, { label: 'Catalyst', v: Math.round(catalystScore), wt: 20, detail: `Rev ${s.revcagr}%` } ], insight: `P/E ${s.pe} dot Book ${pb.toFixed(1)}x. ${total >= 75 ? 'Turnaround candidate' : 'Waiting'}` };
}
