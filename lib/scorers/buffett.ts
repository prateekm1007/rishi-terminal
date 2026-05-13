import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';

export function scoreBuffett(s: Stock): RishiScore {
  // ROE sustainability
  const roeS = clamp(s.roe >= 20 ? 100 : s.roe * 5);

  // Economic moat (via Operating Profit Margin)
  const moatS = clamp(s.opm >= 20 ? 100 : s.opm * 5);

  // Owner Earnings = Net Profit + Depreciation - 70% of Capex
  const oe = s.np + s.dep - s.capex * 0.7;
  const oeY = (oe / s.mktcap) * 100;
  const oeS = clamp(oeY >= 8 ? 100 : oeY * 12.5);

  // Management skin in the game
  const mgS = clamp(s.promo >= 30 ? 100 : s.promo * 3.33);

  const total = roeS * 0.30 + moatS * 0.25 + oeS * 0.20 + mgS * 0.15 + 50 * 0.10;

  return {
    name: 'Buffett',
    full: 'Warren Buffett',
    label: 'Quality Moat',
    score: Math.round(total),
    origin: 'Global',
    comps: [
      {
        label: 'ROE Sustainability',
        v: Math.round(roeS),
        wt: 30,
        detail: `${s.roe}% target >20%`
      },
      {
        label: 'Economic Moat',
        v: Math.round(moatS),
        wt: 25,
        detail: `OPM ${s.opm}% target >20%`
      },
      {
        label: 'Owner Earnings Yield',
        v: Math.round(oeS),
        wt: 20,
        detail: `${oeY.toFixed(1)}% target >8%`
      },
      {
        label: 'Management Skin',
        v: Math.round(mgS),
        wt: 15,
        detail: `Promoter ${s.promo}%`
      },
    ],
    insight: `ROE ${s.roe}% · OE yield ${oeY.toFixed(1)}% · OPM ${s.opm}%. ${total >= 75 ? 'Wonderful compounder.' : 'Lacks durable moat.'}`
  };
}