import 'server-only';

import type { RishiScore } from '../types';

/**
 * Rishis formula text (founder order, 12 Oct 2026): the /rishis FORMULA box
 * shows the scorer's ACTUAL pillars — never a hand-typed string that can
 * drift (Jhunjhunwala displayed "Sentiment (10%)" while the council scores
 * "Neutral Base (10%)").
 *
 * The text is DERIVED from a real scorer run on the canonical observed
 * fixture: pillar labels + weights as the code declares them. Null-valued
 * pillars (Munger inversion without forensic inputs) still declare their
 * label + weight — the formula describes the framework's structure, not a
 * row's values. Rule 14: the scorer is the one source of truth; this module
 * only formats what the scorer returned.
 */
export function formulaTextFor(comps: RishiScore['comps']): string {
  return comps.map((c) => `${c.label} (${c.wt}%)`).join(' + ');
}
