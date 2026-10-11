/**
 * FD-23 — the P0-5 reversal for asset-side guru cards on reference data
 * (founder order, 11 Oct 2026, recorded in ROADMAP + incident log B-28).
 *
 *   Founder's words, verbatim: "Crypto cards score and category back on
 *   reference data."
 *
 * The acceptance, as the founder specified it:
 *   1. Score and category render on every crypto and commodity guru card
 *      over the static reference inputs — as a SEPARATE heuristic-reference
 *      output type, labelled "Heuristic reference — static reference
 *      inputs, not a verdict" with the source, its attribution and an
 *      as-of time.
 *   2. The category uses the current P0-6 vocabulary ONLY — no BUY, SELL,
 *      HOLD or AVOID appears in any served card string.
 *   3. The closed dataQuality vocabulary is UNCHANGED — "reference" is not
 *      added to it; the heuristic is an output type, not a data-quality
 *      class.
 *   4. Stock verdicts stay gated: stocks show no verdict on seed data.
 *
 * Tested through the REAL code paths /api/gurus calls (the scorers over
 * the real datasets, the real derivation, the real gate) — not a
 * reimplementation. Rule 21: watched RED before the fix (the round-47
 * gate nulls every asset-side score; raw output in
 * docs/evidence/round49/).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

import { CRYPTO_ASSETS } from '@/data/crypto';
import { COMMODITIES } from '@/data/markets';
import {
  dataQualityFromAssetInputs,
  DATA_QUALITY_VALUES,
  type DataQuality,
} from '@/lib/dataQuality';
import { gateAssetVerdict } from '@/lib/gurus/gate';
import {
  GURU_HEURISTIC_LABEL,
  GURU_HEURISTIC_META,
  guruHeuristicProvenanceLine,
  SIMULATED_PERSONA_LABEL,
} from '@/lib/gurus/heuristic';
import { actionLabel, getAction } from '@/lib/scorers/types';
import { scoreSatoshiBodhi } from '@/lib/scorers/crypto/satoshibodhi';
import { scoreVitalikVeda } from '@/lib/scorers/crypto/vitalikVeda';
import { scoreMichaelSaylor } from '@/lib/scorers/crypto/michaelsaylor';
import { scoreJimRogers } from '@/lib/scorers/commodity/jimrogers';
import { scoreRickRule } from '@/lib/scorers/commodity/rickrule';
import { scoreDanielYergin } from '@/lib/scorers/commodity/danielyergin';
import { STOCKS } from '@/data/stocks';
import { getStockScore } from '@/lib/scoring';

/** The P0-6 render vocabulary for an upside-mode category (the closed set
 *  getAction(score, 'UPSIDE') can produce, rendered via actionLabel). */
const P06_CATEGORY_SET = new Set(
  (['STRONGLY_FAVORABLE', 'FAVORABLE', 'BALANCED', 'UNFAVORABLE', 'STRONGLY_UNFAVORABLE'] as const).map(
    (a) => actionLabel(a),
  ),
);

/** The exact derivation /api/gurus uses for a crypto record with NO live
 *  overlay (every indicator input is the static reference value). */
function cryptoReferenceQuality(symbol: string): DataQuality {
  const asset = CRYPTO_ASSETS.find((a) => a.symbol === symbol)!;
  return dataQualityFromAssetInputs({
    price: { source: 'reference', value: asset.price },
    change24h: { source: 'reference', value: asset.change24h },
    rsi: { source: 'reference', value: asset.rsi },
    moving200d: { source: 'reference', value: asset.moving200d },
    fromAth: { source: 'reference', value: asset.fromAth },
  });
}

function commodityReferenceQuality(symbol: string): DataQuality {
  const c = COMMODITIES.find((x) => x.symbol === symbol)!;
  return dataQualityFromAssetInputs({
    price: { source: 'reference', value: c.price },
    changePct: { source: 'reference', value: c.changePct },
    high52w: { source: 'reference', value: c.high52w },
    low52w: { source: 'reference', value: c.low52w },
    inventoryDays: { source: 'reference', value: c.inventoryDays ?? null },
    supercycleScore: { source: 'reference', value: c.supercycleScore ?? null },
  });
}

const CRYPTO_GURUS = [
  { name: 'Satoshi Bodhi', target: 'BTC', scorer: scoreSatoshiBodhi },
  { name: 'Vitalik Veda', target: 'ETH', scorer: scoreVitalikVeda },
  { name: 'Michael Saylor', target: 'BTC', scorer: scoreMichaelSaylor },
];

const COMMODITY_GURUS = [
  { name: 'Jim Rogers', scorer: scoreJimRogers },
  { name: 'Rick Rule', scorer: scoreRickRule },
  { name: 'Daniel Yergin', scorer: scoreDanielYergin },
];

describe('FD-23 A — every crypto guru card serves the heuristic-reference output on reference data', () => {
  it('score and category are served (not withheld) with the exact founder label', () => {
    expect(CRYPTO_ASSETS.length).toBeGreaterThan(0); // positive control: the dataset exists
    for (const g of CRYPTO_GURUS) {
      const asset = CRYPTO_ASSETS.find((a) => a.symbol === g.target)!;
      const dq = cryptoReferenceQuality(g.target);
      expect(dq).toBe('seed'); // reference inputs stay seed quality — the vocabulary is unchanged
      const card = gateAssetVerdict(g.scorer(asset), dq);
      expect(card.outputType).toBe('heuristic-reference');
      expect(card.score).not.toBeNull();
      expect(typeof card.score).toBe('number');
      expect(card.category).not.toBeNull();
      expect(P06_CATEGORY_SET.has(card.category as string)).toBe(true);
      expect(card.category).toBe(actionLabel(getAction(card.score as number, 'UPSIDE')));
      expect(card.label).toBe(GURU_HEURISTIC_LABEL);
    }
  });

  it('the verdict CONTENT stays withheld on reference data — not a verdict', () => {
    for (const g of CRYPTO_GURUS) {
      const asset = CRYPTO_ASSETS.find((a) => a.symbol === g.target)!;
      const card = gateAssetVerdict(g.scorer(asset), cryptoReferenceQuality(g.target));
      expect(card.insight).toBe('');
      expect(card.comps).toEqual([]);
    }
  });
});

describe('FD-23 B — every commodity guru card serves the heuristic-reference output on reference data', () => {
  it('score and category are served (not withheld) with the exact founder label, for every commodity', () => {
    expect(COMMODITIES.length).toBeGreaterThan(0); // positive control
    for (const c of COMMODITIES) {
      const dq = commodityReferenceQuality(c.symbol);
      expect(dq).toBe('seed');
      for (const g of COMMODITY_GURUS) {
        const card = gateAssetVerdict(g.scorer(c), dq);
        expect(card.outputType).toBe('heuristic-reference');
        expect(card.score).not.toBeNull();
        expect(card.category).not.toBeNull();
        expect(P06_CATEGORY_SET.has(card.category as string)).toBe(true);
        expect(card.label).toBe(GURU_HEURISTIC_LABEL);
        expect(card.insight).toBe('');
        expect(card.comps).toEqual([]);
      }
    }
  });
});

describe('FD-23 C — no BUY, SELL, HOLD or AVOID appears in any served card string', () => {
  it('the vocabulary check bites (C5 — embedded pre-fix strings must match)', () => {
    for (const s of ['STRONG BUY', 'Sell now', 'HOLD', 'Avoid', 'top pick to buy']) {
      expect(s.match(/\b(buy|sell|hold|avoid)\b/i)).not.toBeNull();
    }
    for (const s of ['Strongly Favorable', 'Balanced', 'Severe Deterioration', GURU_HEURISTIC_LABEL]) {
      expect(s.match(/\b(buy|sell|hold|avoid)\b/i)).toBeNull();
    }
  });

  it('every string the cards can serve is clean, and the P0-6 category set itself is clean', () => {
    const served: string[] = [GURU_HEURISTIC_LABEL, SIMULATED_PERSONA_LABEL, guruHeuristicProvenanceLine()];
    for (const g of CRYPTO_GURUS) {
      const asset = CRYPTO_ASSETS.find((a) => a.symbol === g.target)!;
      const card = gateAssetVerdict(g.scorer(asset), cryptoReferenceQuality(g.target));
      served.push(card.name, card.label, card.category ?? '', card.insight);
    }
    for (const c of COMMODITIES) {
      for (const g of COMMODITY_GURUS) {
        const card = gateAssetVerdict(g.scorer(c), commodityReferenceQuality(c.symbol));
        served.push(card.name, card.label, card.category ?? '', card.insight);
      }
    }
    for (const s of served) {
      expect(s.match(/\b(buy|sell|hold|avoid)\b/i)).toBeNull();
    }
    for (const category of P06_CATEGORY_SET) {
      expect(category.match(/\b(buy|sell|hold|avoid)\b/i)).toBeNull();
    }
  });
});

describe('FD-23 D — the closed dataQuality vocabulary is unchanged (no "reference" class)', () => {
  it('DATA_QUALITY_VALUES is exactly live/delayed/seed/missing', () => {
    expect([...DATA_QUALITY_VALUES]).toEqual(['live', 'delayed', 'seed', 'missing']);
  });

  it('the heuristic is a separate OUTPUT type, not a data-quality value', () => {
    // The output-type vocabulary lives on the card, disjoint from DataQuality.
    const asset = CRYPTO_ASSETS.find((a) => a.symbol === 'BTC')!;
    const card = gateAssetVerdict(CRYPTO_GURUS[0].scorer(asset), cryptoReferenceQuality('BTC'));
    expect(DATA_QUALITY_VALUES).not.toContain('reference' as unknown as DataQuality);
    expect(card.outputType).toBe('heuristic-reference');
    // and the output-type vocabulary itself is the closed three-value set
    expect(card.outputType === 'verdict' || card.outputType === 'heuristic-reference' || card.outputType === 'no-verdict').toBe(true);
  });
});

describe('FD-23 E — the provenance block: source, attribution, as-of', () => {
  it('carries a named source and attribution, and an HONEST as-of (R1: no fabricated date)', () => {
    expect(GURU_HEURISTIC_META.source.length).toBeGreaterThan(0);
    expect(GURU_HEURISTIC_META.attribution.length).toBeGreaterThan(0);
    // No provable capture date exists for the static reference inputs —
    // the as-of must be null with the honest note, never a stamped date.
    expect(GURU_HEURISTIC_META.asOf).toBeNull();
    expect(GURU_HEURISTIC_META.asOfNote.length).toBeGreaterThan(0);
    const line = guruHeuristicProvenanceLine();
    expect(line).toContain('Source:');
    expect(line).toContain('Attribution:');
    expect(line).toContain('As of:');
    expect(line).toContain(GURU_HEURISTIC_META.source);
    expect(line).toContain(GURU_HEURISTIC_META.attribution);
  });
});

describe('FD-23 F — stock verdicts stay gated on seed data (P0-5 stock side untouched)', () => {
  it('RELIANCE and every seed record still serve a null consensus', () => {
    const report = getStockScore(STOCKS['RELIANCE']);
    expect(report.dataQuality).toBe('seed');
    expect(report.consensus).toBeNull();
    let gated = 0;
    for (const s of Object.keys(STOCKS)) {
      const r = getStockScore(STOCKS[s]);
      if (r.dataQuality === 'seed' || r.dataQuality === 'missing') {
        expect(r.consensus).toBeNull();
        gated += 1;
      }
    }
    expect(gated).toBe(Object.keys(STOCKS).length); // the seed universe is fully gated
  });
});

describe('FD-23 G — the card surfaces render the contract (source pins, B-18)', () => {
  const CARD_SURFACES = [
    'app/crypto/page.tsx',
    'components/crypto/CryptoDetailClient.tsx',
    'app/commodities/page.tsx',
    'components/commodities/CommodityDetailClient.tsx',
  ];

  it('every card surface renders the label, the provenance line and the Simulated Persona chip', () => {
    for (const f of CARD_SURFACES) {
      const src = readFileSync(f, 'utf8');
      expect(src).toContain('GuruHeuristicNote');
      expect(src).toContain('SimulatedPersonaChip');
    }
  });

  it('no attributed quotation of a real person renders on any guru card (P0-7)', () => {
    for (const f of CARD_SURFACES) {
      const src = readFileSync(f, 'utf8');
      // field accesses and object keys only — the `philosophy-heading`
      // CSS class is a style name, not a quote field
      expect(src.match(/\.philosophy\b|\.quote\b|philosophy\s*:|quote\s*:/)).toBeNull();
    }
    // and the metadata modules no longer carry quote fields (rule 17)
    for (const f of ['lib/gurus/crypto.ts', 'lib/gurus/commodity.ts']) {
      const src = readFileSync(f, 'utf8');
      expect(src.match(/\.philosophy\b|\.quote\b|philosophy\s*:|quote\s*:/)).toBeNull();
    }
  });
});
