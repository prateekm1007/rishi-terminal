import { CryptoAsset } from '../../../data/crypto';
import { RishiScore } from '../../types';

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

export function scoreMichaelSaylor(c: CryptoAsset): RishiScore {
  // Michael Saylor - Bitcoin as Corporate Treasury Strategy

  // 1. Long-term accumulation signal (7d momentum)
  const momentumS = clamp(50 + c.change7d * 4);

  // 2. RSI (60-80 ideal for corporate buying conviction)
  const rsiS = c.rsi >= 60 && c.rsi <= 80 ? 100 : c.rsi > 80 ? clamp(100 - (c.rsi - 80) * 5) : clamp(c.rsi * 1.67);

  // 3. Volume/MCap turnover (institutional interest)
  const turnover = (c.volume24h / c.marketCap) * 100;
  const turnoverS = clamp(turnover >= 8 ? 100 : turnover >= 5 ? 80 : (turnover / 5) * 80);

  // 4. MACD signal
  const macdS = c.macd === 'BULLISH' ? 100 : c.macd === 'NEUTRAL' ? 40 : 10;

  // 5. Recovery from ATH (corporate treasuries buy dips)
  const recoveryS = c.fromAth >= -30 ? 100 : c.fromAth >= -50 ? clamp(100 - Math.abs(c.fromAth + 30) * 3) : 30;

  const total = momentumS * 0.25 + rsiS * 0.20 + turnoverS * 0.25 + macdS * 0.15 + recoveryS * 0.15;

  return {
    name: 'Michael Saylor',
    full: 'Michael Saylor',
    label: 'Corporate Treasury Bitcoin',
    score: Math.round(total),
    origin: 'Crypto',
    comps: [
      { label: 'Accumulation Signal', v: Math.round(momentumS), wt: 25, detail: `${c.change7d >= 0 ? '+' : ''}${c.change7d.toFixed(2)}% 7d` },
      { label: 'Conviction Heat', v: Math.round(rsiS), wt: 20, detail: `RSI ${c.rsi} (ideal: 60-80 for buyers)` },
      { label: 'Institutional Flow', v: Math.round(turnoverS), wt: 25, detail: `${turnover.toFixed(2)}% daily turnover` },
      { label: 'MACD Direction', v: Math.round(macdS), wt: 15, detail: c.macd },
      { label: 'Dip Recovery', v: Math.round(recoveryS), wt: 15, detail: `${c.fromAth.toFixed(1)}% from ATH` },
    ],
    insight: `${c.symbol} at $${c.price.toLocaleString()} · ${c.change7d >= 0 ? '+' : ''}${c.change7d.toFixed(2)}% 7d. ${total >= 75 ? 'Strong corporate buying opportunity — digital property accumulation phase.' : total >= 60 ? 'Moderate strength — dollar-cost averaging valid.' : 'Weak institutional signal — wait for confirmation.'}`
  };
}