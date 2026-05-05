import { CryptoAsset } from '../../../data/crypto';
import { RishiScore } from '../../types';

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

export function scoreVitalikVeda(c: CryptoAsset): RishiScore {
  const priceS = clamp(c.price >= 3500 ? 100 : (c.price / 3500) * 100);
  const momentumS = clamp(50 + c.change7d * 5);
  const rsiS = c.rsi >= 55 && c.rsi <= 75 ? 100 : c.rsi > 75 ? clamp(100 - (c.rsi - 75) * 4) : clamp(c.rsi * 1.8);
  const macdS = c.macd === 'BULLISH' ? 100 : c.macd === 'NEUTRAL' ? 50 : 20;
  const activityRatio = (c.volume24h / c.marketCap) * 100;
  const activityS = clamp(activityRatio >= 4 ? 100 : activityRatio >= 2 ? 70 : (activityRatio / 2) * 70);
  const total = priceS * 0.25 + momentumS * 0.20 + rsiS * 0.20 + macdS * 0.15 + activityS * 0.20;
  return {
    name: 'Vitalik Veda',
    full: 'Vitalik Veda',
    label: 'Protocol Fundamentalist',
    score: Math.round(total),
    origin: 'Crypto',
    comps: [
      { label: 'Network Health', v: Math.round(priceS), wt: 25, detail: `$${c.price.toLocaleString()} (target >$3500)` },
      { label: '7D Protocol Growth', v: Math.round(momentumS), wt: 20, detail: `${c.change7d >= 0 ? '+' : ''}${c.change7d.toFixed(2)}%` },
      { label: 'RSI Strength', v: Math.round(rsiS), wt: 20, detail: `RSI ${c.rsi} (ideal: 55-75)` },
      { label: 'MACD Trend', v: Math.round(macdS), wt: 15, detail: c.macd },
      { label: 'On-Chain Activity', v: Math.round(activityS), wt: 20, detail: `${activityRatio.toFixed(2)}% vol/mcap` },
    ],
    insight: `${c.symbol} at $${c.price.toLocaleString()} · ${c.change7d >= 0 ? '+' : ''}${c.change7d.toFixed(2)}% 7d. ${total >= 75 ? 'Strong protocol activity — developer momentum high.' : total >= 60 ? 'Healthy network growth — ecosystem expanding.' : 'Weak adoption or consolidation phase.'}`
  };
}