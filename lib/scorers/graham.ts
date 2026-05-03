import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';

export function scoreGraham(s: Stock): RishiScore {
  const ncav = (s.ca - s.tl) / s.sh;
  const ncavDisc = ((ncav - s.price) / s.price) * 100;
  const ncavS = clamp(ncavDisc >= 30 ? 100 : ncavDisc > 0 ? ncavDisc * 3.33 : 50 + ncavDisc);
  const peS = clamp(s.pe <= 15 ? 100 : Math.max(0, 100 - (s.pe - 15) * 5));
  const cr = s.ca / Math.max(1, s.tl);
  const crS = clamp(cr * 50);
  const deS = clamp(s.de <= 0.5 ? 100 : Math.max(0, 100 - s.de * 100));
  const total = ncavS * 0.40 + peS * 0.25 + crS * 0.15 + deS * 0.20;
  return {
    name: 'Graham', full: 'Benjamin Graham', label: 'Deep Value',
    score: Math.round(total), origin: 'Global',
    comps: [
      { label: 'NCAV Discount', v: Math.round(ncavS), wt: 40, detail: `NCAV ${Math.round(ncav)} vs ${s.price} (${ncavDisc > 0 ? '+' : ''}${Math.round(ncavDisc)}%)` },
      { label: 'P/E Value', v: Math.round(peS), wt: 25, detail: `P/E ${s.pe} target <15` },
      { label: 'Current Ratio Safety', v: Math.round(crS), wt: 15, detail: `Ratio ${cr.toFixed(2)} target >2` },
      { label: 'Debt Safety', v: Math.round(deS), wt: 20, detail: `D/E ${s.de.toFixed(2)} target <0.5` },
    ],
    insight: `NCAV ${Math.round(ncav)} vs price ${s.price} · P/E ${s.pe}. ${ncavDisc > 0 ? 'Trading below liquidation value!' : 'Premium to net assets.'}`
  };
}
