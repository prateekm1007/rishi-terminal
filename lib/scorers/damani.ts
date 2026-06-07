import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';

export function scoreDamani(s: Stock): RishiScore {
  const deS = s.de <= 0.1 ? 100 : s.de <= 0.3 ? 70 : clamp(100 - s.de * 100);
  const roceS = clamp(s.roce >= 25 ? 100 : s.roce * 4);
  const fcfM = (s.fcf / s.rev) * 100;
  const cfS = clamp(fcfM >= 10 ? 100 : fcfM * 10);
  const moatS = clamp(s.opm >= 15 ? 100 : s.opm * 6.67);
  const total = deS * 0.30 + roceS * 0.25 + cfS * 0.20 + moatS * 0.15 + 50 * 0.10;
  return {
    name: 'Damani', full: 'Radhakishan Damani', label: 'Zero-Debt Fortress',
    score: Math.round(total), origin: 'Bharat',
    comps: [
      { label: 'Zero-Debt Filter', v: Math.round(deS), wt: 30, detail: `D/E ${s.de.toFixed(2)} target <= 0.1` },
      { label: 'ROCE Sustainability', v: Math.round(roceS), wt: 25, detail: `${s.roce}% target >25%` },
      { label: 'Cash Flow Predictability', v: Math.round(cfS), wt: 20, detail: `FCF margin ${fcfM.toFixed(1)}% target >10%` },
      { label: 'Defensive Moat', v: Math.round(moatS), wt: 15, detail: `OPM ${s.opm}% target >15%` },
    ],
    insight: `D/E ${s.de.toFixed(2)} · ROCE ${s.roce}% · FCF margin ${fcfM.toFixed(1)}%. ${s.de <= 0.1 ? 'Passes' : 'Fails'} Damani zero-debt test.`
  };
}
