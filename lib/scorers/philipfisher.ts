import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';

export function scorePhilipFisher(s: Stock): RishiScore {
  const mgmtScore = s.promo >= 50 ? 100 : clamp(s.promo * 2);
  const rndScore = s.capex >= s.rev * 0.08 ? 100 : clamp((s.capex / s.rev) * 100 * 12.5);
  const growthScore = s.epscagr >= 20 ? 100 : clamp(s.epscagr * 5);
  const marketScore = s.mktcap >= 50000 && s.mktcap <= 500000 ? 100 : s.mktcap < 50000 ? 70 : clamp(100 - (s.mktcap - 500000) / 100000);
  const total = mgmtScore * 0.25 + rndScore * 0.25 + growthScore * 0.25 + marketScore * 0.25;
  return { name: 'Philip Fisher', full: 'Philip Fisher', label: 'Scuttlebutt Growth', score: Math.round(total), origin: 'Global', comps: [ { label: 'Management Quality', v: Math.round(mgmtScore), wt: 25, detail: `Insider ${s.promo}%` }, { label: 'RandD Investment', v: Math.round(rndScore), wt: 25, detail: `Capex ${((s.capex/s.rev)*100).toFixed(1)}%` }, { label: 'Growth Rate', v: Math.round(growthScore), wt: 25, detail: `EPS CAGR ${s.epscagr}%` }, { label: 'Market Size', v: Math.round(marketScore), wt: 25, detail: `Mktcap Rs${Math.round(s.mktcap/1000)}K` } ], insight: `Growth compounder. Mgmt ${s.promo}%. ${total >= 75 ? 'Buy signal' : 'Research more'}` };
}