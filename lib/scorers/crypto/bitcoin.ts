import { CryptoAsset } from '../../../data/crypto';
import { RishiScore } from '../../types';

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

export function scoreBitcoinMaximalist(c: CryptoAsset): RishiScore {
  const aboveMA = c.price > c.moving200d;
  const maS = aboveMA ? 100 : clamp((c.price / c.moving200d) * 100);
  const athDistS = clamp(100 + c.fromAth);
  const rsiS = c.rsi >= 50 && c.rsi <= 70 ? 100 : c.rsi > 70 ? clamp(100 - (c.rsi - 70) * 3) : clamp(c.rsi * 2);
  const macdS = c.macd === 'BULLISH' ? 100 : c.macd === 'NEUTRAL' ? 60 : 20;
  const adoptionS = clamp(c.price >= 90000 ? 100 : (c.price / 90000) * 100);
  const total = maS * 0.25 + athDistS * 0.20 + rsiS * 0.20 + macdS * 0.15 + adoptionS * 0.20;

  return {
    name: 'Bitcoin Maximalist',
    full: 'Digital Gold Guru',
    label: 'Store of Value',
    score: Math.round(total),
    origin: 'Crypto',
    comps: [
      { label: '200D MA Trend', v: Math.round(maS), wt: 25, detail: aboveMA ? `Above MA ($${c.moving200d.toLocaleString()})` : 'Below MA' },
      { label: 'ATH Proximity', v: Math.round(athDistS), wt: 20, detail: `${c.fromAth.toFixed(1)}% from ATH` },
      { label: 'RSI Momentum', v: Math.round(rsiS), wt: 20, detail: `RSI ${c.rsi} (ideal 50-70)` },
      { label: 'MACD Signal', v: Math.round(macdS), wt: 15, detail: c.macd },
      { label: 'Adoption Level', v: Math.round(adoptionS), wt: 20, detail: `$${c.price.toLocaleString()} (target >$90k)` },
    ],
    insight: `${c.symbol} at $${c.price.toLocaleString()} - ${c.change24h >= 0 ? '+' : ''}${c.change24h.toFixed(2)}% 24h. ${total >= 75 ? 'Strong HODLer conviction.' : total >= 60 ? 'Moderate bullish.' : 'Weak momentum or correction phase.'}`
  };
}