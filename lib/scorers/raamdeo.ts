import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';

export function scoreRaamdeo(s: Stock): RishiScore {
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