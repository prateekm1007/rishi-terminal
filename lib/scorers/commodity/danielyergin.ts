import { CommodityData } from '../../../data/markets';
import { RishiScore } from '../../types';

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

export function scoreDanielYergin(c: CommodityData): RishiScore {
  // Daniel Yergin - Energy Historian + Geopolitical Oil Expert
  // Focus: Crude oil, energy transitions, geopolitical supply

  // 1. Price level (above $75 = strong demand, tight supply)
  const demandS = clamp(c.price >= 75 ? 100 : c.price >= 65 ? 70 : (c.price / 65) * 70);

  // 2. Momentum (positive = economic growth signal)
  const momentumS = clamp(50 + c.changePct * 10);

  // 3. Range position (higher = boom cycle)
  const range52w = c.high52w - c.low52w;
  const rangePos = range52w > 0 ? ((c.price - c.low52w) / range52w) * 100 : 50;
  const rangePosS = clamp(rangePos);

  // 4. Geopolitical premium (above $80 = supply risk)
  const geopoliticalS = clamp(c.price >= 80 ? 100 : c.price >= 70 ? 60 : (c.price / 70) * 60);

  const total = demandS * 0.30 + momentumS * 0.25 + rangePosS * 0.25 + geopoliticalS * 0.20;

  return {
    name: 'Daniel Yergin',
    full: 'Daniel Yergin',
    label: 'Energy Geopolitics',
    score: Math.round(total),
    origin: 'Commodity',
    comps: [
      { label: 'Global Demand', v: Math.round(demandS), wt: 30, detail: `${c.price}${c.unit} (target >$75)` },
      { label: 'Economic Momentum', v: Math.round(momentumS), wt: 25, detail: `${c.changePct >= 0 ? '+' : ''}${c.changePct.toFixed(2)}%` },
      { label: 'Energy Cycle', v: Math.round(rangePosS), wt: 25, detail: `${rangePos.toFixed(0)}% of 52W range` },
      { label: 'Geopolitical Risk', v: Math.round(geopoliticalS), wt: 20, detail: c.price >= 80 ? 'High supply risk' : 'Normal supply' },
    ],
    insight: `${c.name} at ${c.price}${c.unit} · ${c.changePct >= 0 ? 'Rising' : 'Falling'} ${Math.abs(c.changePct).toFixed(2)}%. ${total >= 70 ? 'Strong energy demand — growth signal.' : total >= 50 ? 'Moderate demand — watch supply.' : 'Weak demand or oversupply.'}`
  };
}