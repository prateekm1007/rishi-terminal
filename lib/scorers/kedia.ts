import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';

export function scoreKedia(s: Stock): RishiScore {
  const smallS = s.mktcap <= 5000 ? 100 : clamp(100 - (s.mktcap - 5000) / 100);
  const manageableS = s.de <= 0.5 ? 100 : clamp(100 - s.de * 100);
  const innovS = clamp(s.opm >= 12 ? 100 : s.opm * 8.33);
  const emergingS = clamp(s.revcagr >= 15 ? 100 : s.revcagr * 6.67);
  const total = smallS * 0.20 + manageableS * 0.20 + innovS * 0.20 + emergingS * 0.20 + 50 * 0.20;
  return {
    name: 'Kedia', full: 'Vijay Kedia', label: 'SMILE Formula',
    score: Math.round(total), origin: 'Bharat',
    comps: [
      { label: 'Small (Size)', v: Math.round(smallS), wt: 20, detail: `${Math.round(s.mktcap)}Cr target <5000Cr` },
      { label: 'Manageable (Debt)', v: Math.round(manageableS), wt: 20, detail: `D/E ${s.de.toFixed(2)} target <0.5` },
      { label: 'Innovative (Margins)', v: Math.round(innovS), wt: 20, detail: `OPM ${s.opm}% target >12%` },
      { label: 'Emerging (Growth)', v: Math.round(emergingS), wt: 20, detail: `Rev CAGR ${s.revcagr}% target >15%` },
    ],
    insight: `SMILE: Size ${Math.round(s.mktcap)}Cr · Debt ${s.de.toFixed(2)} · Margins ${s.opm}% · Growth ${s.revcagr}%. ${total >= 70 ? 'Classic SMILE fit!' : 'Lacks SMILE charm.'}`
  };
}
