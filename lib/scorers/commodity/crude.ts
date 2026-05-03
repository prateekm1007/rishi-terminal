import { CommodityData } from '../../../data/markets';
import { RishiScore } from '../../types';

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

export function scoreCrudeRishi(c: CommodityData): RishiScore {
  // Macro-Cycle Demand Scoring
  // 1. Price level (above $75 = strong demand)
  const demandS = clamp(c.price >= 75 ? 100 : c.price >= 65 ? 70 : (c.price / 65) * 70);
  
  // 2. Momentum (positive = economic growth)
  const momentumS = clamp(50 + c.changePct * 10);
  
  // 3. Range position (higher = boom cycle)
  const range52w = c.high52w - c.low52w;
  const rangePos = range52w > 0 ? ((c.price - c.low52w) / range52w) * 100 : 50;
  const rangePosS = clamp(rangePos);
  
  // 4. Supply crunch signal (above $80 = tight market)
  const supplyS = clamp(c.price >= 80 ? 100 : c.price >= 70 ? 60 : (c.price / 70) * 60);
  
  const total = demandS * 0.30 + momentumS * 0.25 + rangePosS * 0.25 + supplyS * 0.20;
  
  return {
    name: 'Crude Rishi',
    full: 'Macro-Cycle Guru',
    label: 'Economic Pulse',
    score: Math.round(total),
    origin: 'Commodity',
    comps: [
      { label: 'Global Demand', v: Math.round(demandS), wt: 30, detail: `$${c.price}/bbl (target >$75)` },
      { label: 'Economic Momentum', v: Math.round(momentumS), wt: 25, detail: `${c.changePct >= 0 ? '+' : ''}${c.changePct.toFixed(2)}%` },
      { label: '52W Cycle Position', v: Math.round(rangePosS), wt: 25, detail: `${rangePos.toFixed(0)}% of range` },
      { label: 'Supply Tightness', v: Math.round(supplyS), wt: 20, detail: c.price >= 80 ? 'Tight supply' : 'Normal supply' },
    ],
    insight: `Crude at $${c.price}/bbl · ${c.changePct >= 0 ? 'Rising' : 'Falling'} ${Math.abs(c.changePct).toFixed(2)}%. ${total >= 70 ? 'Strong economic growth signal.' : total >= 50 ? 'Moderate demand.' : 'Weak growth or oversupply.'}`
  };
}