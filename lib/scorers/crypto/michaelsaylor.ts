import { CryptoAsset } from '../../../data/crypto';
import { RishiScore } from '../../types';

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

export function scoreMichaelSaylor(c: CryptoAsset): RishiScore {
  const isBTC = c.symbol === 'BTC';
  const btcBias = isBTC ? 100 : c.symbol === 'ETH' ? 40 : 20;
  const maS = c.price > c.moving200d ? 100 : clamp((c.price / c.moving200d) * 100);
  const athDistS = clamp(100 + c.fromAth);
  const weeklyMomentumS = clamp(50 + c.change7d * 8);
  const convictionS = isBTC ? 100 : 30;
  const total = btcBias * 0.30 + maS * 0.25 + athDistS * 0.20 + weeklyMomentumS * 0.15 + convictionS * 0.10;

  return {
    name: 'Michael Saylor',
    full: 'Michael Saylor',
    label: 'Digital Property Maximalist',
    score: Math.round(total),
    origin: 'Crypto',
    comps: [
      { label: 'BTC Conviction', v: Math.round(btcBias), wt: 30, detail: isBTC ? 'Primary digital property' : 'Lower conviction' },
      { label: '200D MA Trend', v: Math.round(maS), wt: 25, detail: c.price > c.moving200d ? `Above MA ($${c.moving200d.toLocaleString()})` : 'Below MA' },
      { label: 'ATH Distance', v: Math.round(athDistS), wt: 20, detail: `${c.fromAth.toFixed(1)}% from ATH` },
      { label: 'Weekly Momentum', v: Math.round(weeklyMomentumS), wt: 15, detail: `${c.change7d >= 0 ? '+' : ''}${c.change7d.toFixed(2)}% 7d` },
      { label: 'Corporate Strategy', v: Math.round(convictionS), wt: 10, detail: isBTC ? 'Treasury reserve asset' : 'Not primary focus' },
    ],
    insight: `${c.symbol} at $${c.price.toLocaleString()} - ${c.change7d >= 0 ? '+' : ''}${c.change7d.toFixed(2)}% 7d. ${total >= 75 ? 'Strong corporate buying opportunity - digital property accumulation phase.' : total >= 60 ? 'Moderate strength - dollar-cost averaging valid.' : 'Weak institutional signal - wait for confirmation.'}`
  };
}