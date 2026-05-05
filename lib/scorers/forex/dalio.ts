import { CommodityData } from '../../../data/markets';
import { RishiScore } from '../../types';

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

export function scoreRayDalio(c: CommodityData): RishiScore {
  const range52w = c.high52w - c.low52w;
  const rangePos = range52w > 0 ? ((c.price - c.low52w) / range52w) * 100 : 50;
  const rangePosS = clamp(rangePos);
  const balanceS = rangePos > 30 && rangePos < 70 ? 100 : rangePos > 20 && rangePos < 80 ? 70 : 40;
  const diversificationS = 75;
  const debtCycleS = c.changePct > 0 ? clamp(60 + c.changePct * 8) : clamp(60 + c.changePct * 6);
  const total = balanceS * 0.30 + diversificationS * 0.25 + debtCycleS * 0.25 + rangePosS * 0.20;
  return {
    name: 'Ray Dalio',
    full: 'Ray Dalio',
    label: 'All Weather Principles',
    score: Math.round(total),
    origin: 'Forex/Macro',
    comps: [
      { label: 'Portfolio Balance', v: Math.round(balanceS), wt: 30, detail: rangePos > 30 && rangePos < 70 ? 'Balanced zone' : 'Extreme zone' },
      { label: 'Diversification Value', v: Math.round(diversificationS), wt: 25, detail: 'Asset class diversifier' },
      { label: 'Debt Cycle Signal', v: Math.round(debtCycleS), wt: 25, detail: `${c.changePct >= 0 ? '+' : ''}${c.changePct.toFixed(2)}%` },
      { label: 'Range Position', v: Math.round(rangePosS), wt: 20, detail: `${rangePos.toFixed(0)}% of 52W range` },
    ],
    insight: `${c.name} at ${c.price}${c.unit}. ${total >= 70 ? 'Strong All Weather allocation signal — include in balanced portfolio.' : total >= 50 ? 'Moderate signal — small portfolio allocation.' : 'Low allocation priority — rebalance away.'}`
  };
}