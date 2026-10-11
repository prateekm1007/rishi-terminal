// test/verdictGate.uniform.test.ts
// Round-47 P0-5-VERDICT-UNIFORM (founder order, 2026-10-11):
//
//   "Build one verdict gate. It returns verdict or no-verdict from
//    dataQuality, and every surface calls it: /stocks, stock pages,
//    dashboard, Council Today and /rishis cards. Test: for every symbol,
//    the list score is blank exactly when the detail page shows no
//    verdict, and no row with PE 0 or ROE 0 gets a score."
//
// This file pins exactly that acceptance, through the REAL code paths
// both surfaces render from — not a reimplementation:
//   - the LIST score   = getSlimIndex() row consensus (what /stocks,
//     the lab tabs and the chat picker render);
//   - the DETAIL page  = getStockScore(stock) gated by
//     verdictsAllowed(report.dataQuality) (the exact boolean
//     StockPageClient renders RishiScoreDual / RishiGrid / RishiCouncil
//     under — the "rishis cards" and the council);
//   - the DASHBOARD    = rankTopBuy / computeShortRadar / pickStockOfTheDay
//     (lib/scoring/rankings.ts — the same gate applied at the ranking
//     boundary).
//
// The asset-side pins (D) extend the same ONE gate to the crypto /
// commodity guru verdict cards ("/rishis cards" on the asset surfaces):
// a verdict built on static reference indicators is a seed-quality
// verdict and returns no verdict, identically to stocks.

import { describe, it, expect } from 'vitest';

import { STOCKS } from '@/data/stocks';
import { getStockScore } from '@/lib/scoring';
import { getSlimIndex } from '@/lib/scoring/slimIndex';
import { rankTopBuy, computeShortRadar, pickStockOfTheDay } from '@/lib/scoring/rankings';
import type { RishiScore } from '@/lib/types';
import {
  verdictsAllowed,
  dataQualityFromAssetInputs,
  type DataQuality,
} from '@/lib/dataQuality';
import { gateAssetVerdict } from '@/lib/gurus/gate';

const symbols = Object.keys(STOCKS);

describe('P0-5 A — list/detail verdict parity (every symbol)', () => {
  it('the list score is blank exactly when the detail page shows no verdict', () => {
    const slim = getSlimIndex();
    expect(slim.length).toBe(symbols.length);

    let blank = 0;
    for (const row of slim) {
      const stock = STOCKS[row.symbol];
      const report = getStockScore(stock);
      // The detail page's exact gate condition (StockPageClient):
      const detailShowsVerdict = verdictsAllowed(report.dataQuality);

      // "exactly when": both directions.
      expect(row.consensus === null).toBe(!detailShowsVerdict);
      // The list value IS the detail value — no second scorer, no drift.
      expect(row.consensus).toBe(report.consensus);

      if (row.consensus === null) blank += 1;
    }
    // Positive control (C10): the gate actually bites on this dataset —
    // the seed universe is fully gated (896 seed records, 0 verdicts).
    expect(blank).toBe(symbols.length);
  });

  it('the dashboard ranked widgets render no scored row on the seed universe', () => {
    // The dashboard's ranked trio goes through the same gate at the
    // ranking boundary: on an all-seed universe the widgets render the
    // honest disabled state (empty arrays / null pick).
    expect(rankTopBuy(6)).toEqual([]);
    expect(computeShortRadar(3)).toEqual([]);
    expect(pickStockOfTheDay()).toBeNull();
  });
});

describe('P0-5 B — no row with PE 0 or ROE 0 gets a score', () => {
  it('the dataset carries no typed PE/ROE zeros (the placeholder class is null)', () => {
    // Post-P0-2 the placeholder classes are NULL at the data layer; a
    // typed zero would be the regresssion this founder test exists for.
    const peZero = symbols.filter((s) => STOCKS[s].pe === 0);
    const roeZero = symbols.filter((s) => STOCKS[s].roe === 0);
    expect(peZero).toEqual([]);
    expect(roeZero).toEqual([]);
  });

  it('any record with PE 0 or ROE 0 (synthetic regression catch) scores nothing', () => {
    // The synthetic catch: if a dataset ever reintroduces the typed
    // zero, every surface must refuse to score it. Pe/roe 0 with the
    // seed provenance context is the impossible-placeholder class
    // (dataQualityFromSeedStock: np > 0 with pe 0 -> "missing"; a bare
    // 0 is the placeholder class -> "seed") — both gate to no verdict.
    const zeroPe = { ...STOCKS['RELIANCE'], pe: 0 } as typeof STOCKS[string];
    const zeroRoe = { ...STOCKS['RELIANCE'], roe: 0 } as typeof STOCKS[string];
    expect(getStockScore(zeroPe).consensus).toBeNull();
    expect(getStockScore(zeroRoe).consensus).toBeNull();
  });
});

describe('P0-5 C — RELIANCE and every seed-field record shows no verdict', () => {
  it('RELIANCE is seed quality with a null consensus on both surfaces', () => {
    const report = getStockScore(STOCKS['RELIANCE']);
    expect(report.dataQuality).toBe('seed');
    expect(report.consensus).toBeNull();
    expect(verdictsAllowed(report.dataQuality)).toBe(false);

    const row = getSlimIndex().find((r) => r.symbol === 'RELIANCE');
    expect(row?.consensus).toBeNull();
    expect(row?.summaryScores).toEqual([]);
  });

  it('every record whose quality fields are seed-sourced is gated', () => {
    // The whole placeholder dataset has no live overlay: every record
    // derives "seed" and every consensus is null. This is the founder's
    // "apply the gate to any other record with seed fields".
    for (const s of symbols) {
      const report = getStockScore(STOCKS[s]);
      if (report.dataQuality === 'seed' || report.dataQuality === 'missing') {
        expect(report.consensus).toBeNull();
      }
    }
  });
});

describe('P0-5 D — the asset-side rishis cards call the same gate', () => {
  it('a record with static reference indicators is seed quality regardless of a live price overlay', () => {
    // The crypto/commodity guru verdicts read RSI / moving averages /
    // ATH distance — static reference values in data/crypto.ts and
    // data/markets.ts. A live price overlay does not make the verdict
    // inputs live: mixed provenance is "seed" (the stock-side rollup
    // rule, applied to assets).
    const dq = dataQualityFromAssetInputs({
      price: { source: 'live', value: 65000 },
      change: { source: 'live', value: 1.2 },
      rsi: { source: 'reference', value: 62 },
      moving200d: { source: 'reference', value: 58000 },
      fromAth: { source: 'reference', value: -18.4 },
    });
    expect(dq).toBe('seed');
    expect(verdictsAllowed(dq)).toBe(false);
  });

  it('every-live inputs are live quality (the future path stays open)', () => {
    const dq = dataQualityFromAssetInputs({
      price: { source: 'live', value: 65000 },
      rsi: { source: 'live', value: 55 },
      moving200d: { source: 'live', value: 58000 },
    });
    expect(dq).toBe('live');
    expect(verdictsAllowed(dq)).toBe(true);
  });

  it('a record with no values at all is missing quality', () => {
    const dq = dataQualityFromAssetInputs({
      price: { source: 'reference', value: null },
      rsi: { source: 'reference', value: null },
    });
    expect(dq).toBe('missing');
    expect(verdictsAllowed(dq)).toBe(false);
  });

  it('gateAssetVerdict nulls the verdict on seed quality and keeps it on live', () => {
    const scored: RishiScore = {
      name: 'Satoshi Bodhi',
      full: 'Sound Money Sage',
      label: 'Digital Scarcity',
      score: 78,
      origin: 'Crypto',
      comps: [
        { label: 'Sound Money', v: 100, wt: 35, detail: 'Fixed supply - 21M cap' },
      ],
      insight: 'Strong HODLer conviction.',
    };

    const seedDq: DataQuality = 'seed';
    const gated = gateAssetVerdict(scored, seedDq);
    expect(gated.score).toBeNull();
    expect(gated.label).toBe('No Verdict — Seed Data');
    expect(gated.comps).toEqual([]);
    expect(gated.insight).toContain('reference');

    const liveDq: DataQuality = 'live';
    const kept = gateAssetVerdict(scored, liveDq);
    expect(kept.score).toBe(78);
    expect(kept.label).toBe('Digital Scarcity');
    expect(kept.comps).toEqual(scored.comps);
  });
});
