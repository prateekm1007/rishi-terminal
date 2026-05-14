import { CryptoAsset } from '../../../data/crypto';
import { RishiScore } from '../../types';

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

export function scoreEthereumProtocol(c: CryptoAsset): RishiScore {
  const isETH = c.symbol === 'ETH';
  const protocolStrengthS = isETH ? 100 : c.symbol === 'SOL' ? 75 : c.symbol === 'AVAX' ? 65 : 40;
  const maS = c.price > c.moving200d ? 100 : clamp((c.price / c.moving200d) * 100);
  const athDistS = clamp(100 + c.fromAth);
  const weeklyMomentumS = clamp(50 + c.change7d * 8);
  const total = protocolStrengthS * 0.35 + maS * 0.25 + athDistS * 0.20 + weeklyMomentumS * 0.20;

  return {
    name: 'Ethereum Protocol',
    full: 'Smart Contract Leader',
    label: 'Platform & Protocol',
    score: Math.round(total),
    origin: 'Crypto',
    comps: [
      { label: 'Protocol Strength', v: Math.round(protocolStrengthS), wt: 35, detail: isETH ? 'Leading smart contract platform' : `${c.symbol} ecosystem` },
      { label: '200D MA Trend', v: Math.round(maS), wt: 25, detail: c.price > c.moving200d ? `Above MA ($${c.moving200d.toLocaleString()})` : 'Below MA' },
      { label: 'ATH Distance', v: Math.round(athDistS), wt: 20, detail: `${c.fromAth.toFixed(1)}% from ATH` },
      { label: 'Weekly Momentum', v: Math.round(weeklyMomentumS), wt: 20, detail: `${c.change7d >= 0 ? '+' : ''}${c.change7d.toFixed(2)}% 7d` },
    ],
    insight: `${c.symbol} at $${c.price.toLocaleString()} - ${c.change7d >= 0 ? '+' : ''}${c.change7d.toFixed(2)}% 7d. ${total >= 75 ? 'Strong protocol activity.' : total >= 60 ? 'Healthy network growth.' : 'Weak adoption or consolidation.'}`
  };
}