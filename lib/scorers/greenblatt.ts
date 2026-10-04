import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp, safeDiv } from '../utils';

/**
 * Magic Formula (T11 zero-guard): ROC and EY divide by market cap; a
 * degenerate mktcap of 0 yields a documented null ("insufficient data")
 * instead of NaN poisoning the consensus.
 *
 * V2 (founder round 9) units contract: np/mktcap is a FRACTION; the scale
 * below targets PERCENTS (ROC > 25%, EY > 10%), so the fraction is converted
 * with *100 before scaling. The previous code scaled the raw fraction —
 * every score came out ~100x too small (mean 0.18, sd 0.5, max 5 over the
 * 916-stock universe) and Greenblatt ranked "Top Bear" on every page.
 *
 * X6 (Round 13) — the corrected allow-list reason (rule 1): on the current
 * seed, 26.9% of the universe scores <= 5 here. That low pile REFLECTS THE
 * PLACEHOLDER SEED'S EARNINGS VALUES — the June np placeholders drive
 * np/mktcap toward zero for a large block of symbols — it is NOT a tuned
 * property of this scorer, and it is NOT evidence the formula is broken.
 * The placeholder-driven pile is why the W4 distribution gate allow-lists
 * this scorer's <= 5 side until FD-1 lands real earnings.
 *
 * Honesty about the formula (rule 1): the strict Magic Formula divides EBIT
 * by (net working capital + net fixed assets) for ROC and by enterprise
 * value for EY. The seed dataset carries none of those fields, so this
 * scorer uses the documented np/mktcap proxy, and the user-facing detail
 * strings state exactly which ratio was computed (founder directive 9:
 * the proxy is never represented as EBIT/EV). Upgrading to EBIT/EV is
 * blocked on the FD-1 data-vendor decision — flagged FOUNDER DECISION
 * NEEDED in the V2 PR.
 */
export function scoreGreenblatt(s: Stock): RishiScore {
  const rocCap = s.mktcap > 0 ? s.mktcap * 0.6 : 0;
  const rocFrac = safeDiv(s.np, rocCap);
  const rocPct = rocFrac === null ? null : rocFrac * 100;
  const rocS = rocPct === null ? null : clamp(rocPct >= 25 ? 100 : rocPct * 4);
  const eyFrac = safeDiv(s.np, s.mktcap);
  const eyPct = eyFrac === null ? null : eyFrac * 100;
  const eyS = eyPct === null ? null : clamp(eyPct >= 10 ? 100 : eyPct * 10);
  const total = rocS === null || eyS === null
    ? null
    : rocS * 0.50 + eyS * 0.50;
  return {
    name: 'Greenblatt', full: 'Joel Greenblatt', label: 'Magic Formula',
    score: total === null ? null : Math.round(total), origin: 'Global',
    comps: [
      { label: 'Return on Capital', v: rocS === null ? 0 : Math.round(rocS), wt: 50, detail: rocPct === null ? 'insufficient data (market cap is 0)' : `ROC ${rocPct.toFixed(1)}% (net profit / 0.6×market cap), target >25%` },
      { label: 'Earnings Yield', v: eyS === null ? 0 : Math.round(eyS), wt: 50, detail: eyPct === null ? 'insufficient data (market cap is 0)' : `EY ${eyPct.toFixed(1)}% (net profit / market cap), target >10%` },
    ],
    insight: total === null
      ? 'Insufficient data \u2014 market cap missing, no Magic Formula verdict.'
      : `Magic Formula: ROC ${rocPct!.toFixed(1)}% · EY ${eyPct!.toFixed(1)}%. ${total >= 80 ? 'Top magic formula pick!' : total >= 60 ? 'Decent value.' : 'Below magic threshold.'}`
  };
}
