import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';

export function scoreWalterSchloss(s: Stock): RishiScore {
  const pbScore = s.price <= s.bvps ? 100 : s.price <= s.bvps * 1.3 ? 80 : clamp(100 - (s.price / s.bvps - 1.3) * 100);
  const debtScore = s.de <= 0.2 ? 100 : s.de <= 0.5 ? 80 : clamp(100 - s.de * 100);
  const insiderScore = s.promo >= 40 ? 100 : clamp(s.promo * 2.5);
  const diversityScore = s.mktcap >= 50000 && s.mktcap <= 200000 ? 100 : clamp(50 + (s.mktcap >= 30000 ? 25 : 0) + (s.mktcap <= 300000 ? 25 : 0));
  const total = pbScore * 0.40 + debtScore * 0.30 + insiderScore * 0.20 + diversityScore * 0.10;
  return { name: 'Walter Schloss', full: 'Walter Schloss', label: 'Cigar Butt', score: Math.round(total), origin: 'Global', comps: [ { label: 'Price to Book', v: Math.round(pbScore), wt: 40, detail: `P/B ${(s.price/s.bvps).toFixed(1)}x` }, { label: 'Zero Debt', v: Math.round(debtScore), wt: 30, detail: `D/E ${s.de}` }, { label: 'Insider Owner', v: Math.round(insiderScore), wt: 20, detail: `${s.promo}%` }, { label: 'Size', v: Math.round(diversityScore), wt: 10, detail: `Mktcap good` } ], insight: `Cigar butt. P/B ${(s.price/s.bvps).toFixed(1)}x. ${total >= 75 ? 'Squeeze profits' : 'Not a butt'}` };
}