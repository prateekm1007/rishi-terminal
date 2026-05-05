import { CryptoAsset } from '../../../data/crypto';
import { RishiScore } from '../../types';

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

export function scoreSatoshiBodhi(c: CryptoAsset): RishiScore {
  // Satoshi Bodhi - Sound Money Maximalist (Bitcoin-focused)
  
  // 1. Price above 200D MA (long-term bull trend)
  const aboveMA = c.price > c.moving200d;
  const maS = aboveMA ? 100 : clamp((c.price / c.moving200d) * 100);

  // 2. Distance from ATH (closer = stronger adoption)
  const athDistS = clamp(100 + c.fromAth);

  // 3. RSI momentum (50-70 ideal for sustained growth)
  const rsiS = c.rsi >= 50 && c.rsi <= 70 ? 100 : c.rsi > 70 ? clamp(100 - (c.rsi - 70) * 3) : clamp(c.rsi * 2);

  // 4. MACD signal
  const macdS = c.macd === 'BULLISH' ? 100 : c.macd === 'NEUTRAL' ? 60 : 20;

  // 5. Sound money threshold (BTC above $90k = institutional adoption)
  const adoptionS = clamp(c.price >= 90000 ? 100 : (c.price / 90000) * 100);

  const total = maS * 0.25 + athDistS * 0.20 + rsiS * 0.20 + macdS * 0.15 + adoptionS * 0.20;

  return {
    name: 'Satoshi Bodhi',
    full: 'Satoshi Bodhi',
    label: 'Sound Money Maximalist',
    score: Math.round(total),
    origin: 'Crypto',
    comps: [
      { label: '200D MA Trend', v: Math.round(maS), wt: 25, detail: aboveMA ? `Above MA ($${c.moving200d.toLocaleString()})` : 'Below MA — accumulation phase' },
      { label: 'ATH Proximity', v: Math.round(athDistS), wt: 20, detail: `${c.fromAth.toFixed(1)}% from all-time high` },
      { label: 'RSI Momentum', v: Math.round(rsiS), wt: 20, detail: `RSI ${c.rsi} (ideal: 50-70 for HODLers)` },
      { label: 'MACD Signal', v: Math.round(macdS), wt: 15, detail: c.macd },
      { label: 'Adoption Level', v: Math.round(adoptionS), wt: 20, detail: `$${c.price.toLocaleString()} (target >$90k)` },
    ],
    insight: `${c.symbol} at $${c.price.toLocaleString()} · ${c.change24h >= 0 ? '+' : ''}${c.change24h.toFixed(2)}% 24h. ${total >= 75 ? 'Strong HODLer conviction — sound money thesis intact.' : total >= 60 ? 'Moderate bullish — accumulation phase.' : 'Weak momentum or correction — long-term patience required.'}`
  };
}