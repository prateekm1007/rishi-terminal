import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp, safeDiv } from '../utils';

/**
 * Magic Formula (T11 zero-guard): ROC and EY divide by market cap; a
 * degenerate mktcap of 0 yields a documented null ("insufficient data")
 * instead of NaN poisoning the consensus.
 */
export function scoreGreenblatt(s: Stock): RishiScore {
  const rocCap = s.mktcap > 0 ? s.mktcap * 0.6 : 0;
  const roc = safeDiv(s.np, rocCap);
  const rocS = roc === null ? null : clamp(roc >= 25 ? 100 : roc * 4);
  const ey = safeDiv(s.np, s.mktcap);
  const eyS = ey === null ? null : clamp(ey >= 10 ? 100 : ey * 10);
  const total = rocS === null || eyS === null
    ? null
    : rocS * 0.50 + eyS * 0.50;
  return {
    name: 'Greenblatt', full: 'Joel Greenblatt', label: 'Magic Formula',
    score: total === null ? null : Math.round(total), origin: 'Global',
    comps: [
      { label: 'Return on Capital', v: rocS === null ? 0 : Math.round(rocS), wt: 50, detail: roc === null ? 'insufficient data (market cap is 0)' : `ROC ${roc.toFixed(1)}% target >25%` },
      { label: 'Earnings Yield', v: eyS === null ? 0 : Math.round(eyS), wt: 50, detail: ey === null ? 'insufficient data (market cap is 0)' : `EY ${ey.toFixed(1)}% target >10%` },
    ],
    insight: total === null
      ? 'Insufficient data \u2014 market cap missing, no Magic Formula verdict.'
      : `Magic Formula: ROC ${roc!.toFixed(1)}% · EY ${ey!.toFixed(1)}%. ${total >= 80 ? 'Top magic formula pick!' : total >= 60 ? 'Decent value.' : 'Below magic threshold.'}`
  };
}
