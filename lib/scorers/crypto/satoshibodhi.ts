import { CryptoAsset } from '../../../data/crypto';
import { RishiScore } from '../../types';

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

export function scoreSatoshiBodhi(c: CryptoAsset): RishiScore {
  const isBTC = c.symbol === 'BTC';
  const soundMoneyS = isBTC ? 100 : 30;
  const aboveMA = c.price > c.moving200d;
  const maS = aboveMA ? 100 : clamp((c.price / c.moving200d) * 100);
  const athDistS = clamp(100 + c.fromAth);
  const rsiS = c.rsi >= 50 && c.rsi <= 70 ? 100 : c.rsi > 70 ? clamp(100 - (c.rsi - 70) * 3) : clamp(c.rsi * 2);
  const total = soundMoneyS * 0.35 + maS * 0.25 + athDistS * 0.20 + rsiS * 0.20;

  return {
    name: 'Satoshi Bodhi',
    full: 'Sound Money Sage',
    label: 'Digital Scarcity',
    score: Math.round(total),
    origin: 'Crypto',
    comps: [
      { label: 'Sound Money', v: Math.round(soundMoneyS), wt: 35, detail: isBTC ? 'Fixed supply - 21M cap' : 'Inflationary token' },
      { label: '200D MA Trend', v: Math.round(maS), wt: 25, detail: aboveMA ? `Above MA ($${c.moving200d.toLocaleString()})` : 'Below MA - accumulation phase' },
      { label: 'ATH Proximity', v: Math.round(athDistS), wt: 20, detail: `${c.fromAth.toFixed(1)}% from ATH` },
      { label: 'RSI Balance', v: Math.round(rsiS), wt: 20, detail: `RSI ${c.rsi}` },
    ],
    insight: `${c.symbol} at $${c.price.toLocaleString()} - ${c.change24h >= 0 ? '+' : ''}${c.change24h.toFixed(2)}% 24h. ${total >= 75 ? 'Strong HODLer conviction - sound money thesis intact.' : total >= 60 ? 'Moderate bullish - accumulation phase.' : 'Weak momentum or correction - long-term patience required.'}`
  };
}