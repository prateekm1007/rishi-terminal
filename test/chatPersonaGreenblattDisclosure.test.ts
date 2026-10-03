import { describe, it, expect } from 'vitest';

import { CANONICAL_PERSONAS } from '@/lib/chat/registry';

/**
 * Founder directive 9 (V2 audit): the platform's Magic Formula score is the
 * documented net-profit/market-cap proxy (strict EBIT/EV data is blocked on
 * FD-1). The Greenblatt persona's biography legitimately describes the real
 *-world strategy — but the STOCK-ANALYSIS prompt drives what the persona says
 * about THIS platform's numbers, and it must not let the proxy be presented
 * as EBIT/EV. These assertions failed before the disclosure sentence was
 * added (RED) and pass after (GREEN).
 */

const GREENBLATT = CANONICAL_PERSONAS.find((p) => p.name === 'Greenblatt');

/** Narrowed access: throws (fails the test) if the stockPrompt is absent. */
function stockPrompt(): string {
  const p = GREENBLATT?.stockPrompt;
  if (typeof p !== 'string' || p.length === 0) {
    throw new Error('Greenblatt persona has no stock-analysis prompt');
  }
  return p;
}

describe('V2 directive-9 audit: Greenblatt persona stock-analysis boundary', () => {
  it('the Greenblatt persona exists with a stock-analysis prompt', () => {
    expect(GREENBLATT).toBeDefined();
    expect(stockPrompt().length).toBeGreaterThan(0);
  });

  it('stockPrompt discloses the platform np/mktcap proxy so the persona never presents it as EBIT/EV', () => {
    expect(stockPrompt()).toContain('net profit / market cap');
  });

  it('stockPrompt draws the boundary: strict formulas named only to deny them', () => {
    // The biography may mention the real-world EBIT formulas; the stock
    // prompt must explicitly deny them for THIS platform's numbers.
    expect(stockPrompt()).toContain('NOT computed here');
    expect(stockPrompt()).toContain('never describe the platform');
  });
});
