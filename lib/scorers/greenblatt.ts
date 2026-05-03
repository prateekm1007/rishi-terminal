import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';

export function scoreGreenblatt(s: Stock): RishiScore {
  const roc = (s.np / (s.mktcap * 0.6)) * 100;
  const rocS = clamp(roc >= 25 ? 100 : roc * 4);
  const ey = (s.np / s.mktcap) * 100;
  const eyS = clamp(ey >= 10 ? 100 : ey * 10);
  const total = rocS * 0.50 + eyS * 0.50;
  return {
    name: 'Greenblatt', full: 'Joel Greenblatt', label: 'Magic Formula',
    score: Math.round(total), origin: 'Global',
    comps: [
      { label: 'Return on Capital', v: Math.round(rocS), wt: 50, detail: `ROC ${roc.toFixed(1)}% target >25%` },
      { label: 'Earnings Yield', v: Math.round(eyS), wt: 50, detail: `EY ${ey.toFixed(1)}% target >10%` },
    ],
    insight: `Magic Formula: ROC ${roc.toFixed(1)}% · EY ${ey.toFixed(1)}%. ${total >= 80 ? 'Top magic formula pick!' : total >= 60 ? 'Decent value.' : 'Below magic threshold.'}`
  };
}
