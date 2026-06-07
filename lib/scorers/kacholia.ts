import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';

export function scoreKacholia(s: Stock): RishiScore {
  const skinS = clamp(s.promo >= 50 ? 100 : s.promo * 2);
  const fcfGrowth = s.epscagr * 1.2;
  const fcfS = clamp(fcfGrowth >= 25 ? 100 : fcfGrowth * 4);
  const sizeS = s.mktcap >= 200 && s.mktcap <= 3000 ? 100 : s.mktcap < 200 ? 50 : clamp(100 - (s.mktcap - 3000) / 100);
  const nicheS = clamp(s.roce >= 20 ? 100 : s.roce * 5);
  const total = skinS * 0.30 + fcfS * 0.25 + nicheS * 0.20 + sizeS * 0.15 + 50 * 0.10;
  return {
    name: 'Kacholia', full: 'Ashish Kacholia', label: 'Whale Small-Cap Hunter',
    score: Math.round(total), origin: 'Bharat',
    comps: [
      { label: 'Promoter Skin', v: Math.round(skinS), wt: 30, detail: `${s.promo}% holding target >50%` },
      { label: 'FCF Acceleration', v: Math.round(fcfS), wt: 25, detail: `${fcfGrowth.toFixed(1)}% growth target >25%` },
      { label: 'Niche ROCE', v: Math.round(nicheS), wt: 20, detail: `ROCE ${s.roce}% target >20%` },
      { label: 'Small-Cap Size', v: Math.round(sizeS), wt: 15, detail: `${Math.round(s.mktcap)}Cr (sweet spot 200-3000Cr)` },
    ],
    insight: `${Math.round(s.mktcap)}Cr mktcap · ${s.promo}% promoter · ROCE ${s.roce}%. ${s.mktcap >= 200 && s.mktcap <= 3000 && s.promo >= 50 ? 'Kacholia sweet spot!' : 'Outside hunting zone.'}`
  };
}
