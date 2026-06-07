import { CryptoAsset } from '../../../data/crypto';
import { RishiScore } from '../../types';

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

export function scoreDeFiYieldFarmer(c: CryptoAsset): RishiScore {
  // DeFi Yield Farmer Framework
  // 1. Momentum (DeFi tokens are momentum-driven)
  const momentumS = clamp(50 + c.change7d * 4); // Higher weight on 7d
  
  // 2. RSI (60-80 ideal for DeFi bull runs)
  const rsiS = c.rsi >= 60 && c.rsi <= 80 ? 100 : c.rsi > 80 ? clamp(100 - (c.rsi - 80) * 5) : clamp(c.rsi * 1.67);
  
  // 3. Volume/MCap (DeFi needs high turnover)
  const turnover = (c.volume24h / c.marketCap) * 100;
  const turnoverS = clamp(turnover >= 8 ? 100 : turnover >= 5 ? 80 : (turnover / 5) * 80);
  
  // 4. MACD signal
  const macdS = c.macd === 'BULLISH' ? 100 : c.macd === 'NEUTRAL' ? 40 : 10;
  
  // 5. Recovery from ATH (DeFi tokens volatile, -30 to -50% normal)
  const recoveryS = c.fromAth >= -30 ? 100 : c.fromAth >= -50 ? clamp(100 - Math.abs(c.fromAth + 30) * 3) : 30;
  
  const total = momentumS * 0.25 + rsiS * 0.20 + turnoverS * 0.25 + macdS * 0.15 + recoveryS * 0.15;
  
  return {
    name: 'DeFi Yield Farmer',
    full: 'Protocol Yield Guru',
    label: 'TVL & APY Hunter',
    score: Math.round(total),
    origin: 'Crypto',
    comps: [
      { label: '7D Momentum', v: Math.round(momentumS), wt: 25, detail: `${c.change7d >= 0 ? '+' : ''}${c.change7d.toFixed(2)}%` },
      { label: 'RSI Heat', v: Math.round(rsiS), wt: 20, detail: `RSI ${c.rsi} (ideal 60-80)` },
      { label: 'Trading Turnover', v: Math.round(turnoverS), wt: 25, detail: `${turnover.toFixed(2)}% vol/mcap` },
      { label: 'MACD Direction', v: Math.round(macdS), wt: 15, detail: c.macd },
      { label: 'ATH Recovery', v: Math.round(recoveryS), wt: 15, detail: `${c.fromAth.toFixed(1)}% from ATH` },
    ],
    insight: `${c.symbol} at $${c.price.toLocaleString()} · ${c.change7d >= 0 ? '+' : ''}${c.change7d.toFixed(2)}% 7d. ${total >= 75 ? 'High yield opportunity.' : total >= 60 ? 'Moderate DeFi strength.' : 'Weak protocol metrics or bear phase.'}`
  };
}