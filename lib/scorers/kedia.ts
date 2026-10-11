import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';
import type { ScoringContext } from '../consensus/orchestrator';
import { inputMissing, insuffDetail } from './unknownInputs';

/**
 * Kedia — SMILE Formula. P0-2 (founder audit 2026-10-11): a required
 * pillar input that was never observed (null / seed placeholder zero)
 * yields `score: null` — no verdict. Observed-data arithmetic unchanged.
 */
export function scoreKedia(s: Stock, ctx?: ScoringContext): RishiScore {
  const mktcapUnknown = inputMissing(s, ctx, 'mktcap');
  const deUnknown = inputMissing(s, ctx, 'de');
  const opmUnknown = inputMissing(s, ctx, 'opm');
  const revcagrUnknown = inputMissing(s, ctx, 'revcagr');
  const insufficient = mktcapUnknown || deUnknown || opmUnknown || revcagrUnknown;

  const smallS = mktcapUnknown ? null : s.mktcap <= 5000 ? 100 : clamp(100 - (s.mktcap - 5000) / 100);
  const manageableS = deUnknown ? null : s.de! <= 0.5 ? 100 : clamp(100 - s.de! * 100);
  const innovS = opmUnknown ? null : clamp(s.opm! >= 12 ? 100 : s.opm! * 8.33);
  const emergingS = revcagrUnknown ? null : clamp(s.revcagr >= 15 ? 100 : s.revcagr * 6.67);
  const total = insufficient
    ? null
    : smallS! * 0.20 + manageableS! * 0.20 + innovS! * 0.20 + emergingS! * 0.20 + 50 * 0.20;
  return {
    name: 'Kedia', full: 'Vijay Kedia', label: 'SMILE Formula',
    score: total === null ? null : Math.round(total), scoreRaw: total, origin: 'Bharat',
    comps: [
      { label: 'Small (Size)', v: smallS === null ? 0 : smallS, wt: 20, detail: smallS === null ? insuffDetail('market cap') : `${Math.round(s.mktcap)}Cr target <5000Cr` },
      { label: 'Manageable (Debt)', v: manageableS === null ? 0 : manageableS, wt: 20, detail: manageableS === null ? insuffDetail('debt (D/E)') : `D/E ${s.de!.toFixed(2)} target <0.5` },
      { label: 'Innovative (Margins)', v: innovS === null ? 0 : innovS, wt: 20, detail: innovS === null ? insuffDetail('operating margin (OPM)') : `OPM ${s.opm}% target >12%` },
      { label: 'Emerging (Growth)', v: emergingS === null ? 0 : emergingS, wt: 20, detail: emergingS === null ? insuffDetail('revenue growth') : `Rev CAGR ${s.revcagr}% target >15%` },
      { label: 'Neutral Base', v: 50, wt: 20, detail: 'design constant — the SMILE formula holds a neutral 50 at 20% weight (S2-05: published, not hidden)' },
    ],
    insight: insufficient
      ? 'Insufficient data — placeholder or missing inputs in the SMILE pillars (size / debt / margin / growth), no Kedia verdict.'
      : `SMILE: Size ${Math.round(s.mktcap)}Cr · Debt ${s.de!.toFixed(2)} · Margins ${s.opm}% · Growth ${s.revcagr}%. ${total! >= 70 ? 'Classic SMILE fit!' : 'Lacks SMILE charm.'}`
  };
}
