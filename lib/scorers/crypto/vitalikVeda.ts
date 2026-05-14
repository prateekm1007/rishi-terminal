import { CryptoAsset } from '../../../data/crypto';
import { RishiScore } from '../../types';

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

export function scoreVitalikVeda(c: CryptoAsset): RishiScore {
  const isETH = c.symbol === 'ETH';
  const platformS = isETH ? 100 : c.symbol === 'SOL' || c.symbol === 'AVAX' ? 70 : 35;
  const maS = c.price > c.moving200d ? 100 : clamp((c.price / c.moving200d) * 100);
  const weeklyMomentumS = clamp(50 + c.change7d * 8);
  const rsiS = c.rsi >= 45 && c.rsi <= 65 ? 100 : c.rsi > 65 ? clamp(100 - (c.rsi - 65) * 4) : clamp(c.rsi * 2);
  const total = platformS * 0.35 + maS * 0.25 + weeklyMomentumS * 0.20 + rsiS * 0.20;

  return {
    name: 'Vitalik Veda',
    full: 'Protocol Philosopher',
    label: 'Ecosystem Builder',
    score: Math.round(total),
    origin: 'Crypto',
    comps: [
      { label: 'Platform Quality', v: Math.round(platformS), wt: 35, detail: isETH ? 'Leading DApp ecosystem' : `${c.symbol} platform` },
      { label: '200D MA Trend', v: Math.round(maS), wt: 25, detail: c.price > c.moving200d ? `Above MA ($${c.moving200d.toLocaleString()})` : 'Below MA' },
      { label: 'Weekly Momentum', v: Math.round(weeklyMomentumS), wt: 20, detail: `${c.change7d >= 0 ? '+' : ''}${c.change7d.toFixed(2)}% 7d` },
      { label: 'RSI Balance', v: Math.round(rsiS), wt: 20, detail: `RSI ${c.rsi}` },
    ],
    insight: `${c.symbol} at $${c.price.toLocaleString()} - ${c.change7d >= 0 ? '+' : ''}${c.change7d.toFixed(2)}% 7d. ${total >= 75 ? 'Strong protocol activity - developer momentum high.' : total >= 60 ? 'Healthy network growth - ecosystem expanding.' : 'Weak adoption or consolidation phase.'}`
  };
}