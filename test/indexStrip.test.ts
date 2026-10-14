// test/indexStrip.test.ts — INDEXSTRIP (founder order, 2026-10-14, option b
// verbatim: "NIFTY from NSE + SENSEX from the existing BSE provider with
// 'Source: BSE' attribution"): the dashboard Today panel's index strip.
//
// Fail-first (C5): these tests were written BEFORE lib/markets/indexStrip.ts
// existed — the red run is docs/evidence/round59/indexstrip-red.txt.
//
// The invariants under test (Rules 1/3/4/16, P0-2):
//   - a row's SOURCE LABEL derives from the row's own `source` field —
//     mislabeling a BSE row as NSE (or the reverse) is impossible by
//     construction, and a test pins it;
//   - a missing number renders "—", never 0 (P0-2: null is not zero);
//   - a leg with no observation produces NO row — the panel's honest
//     empty state renders instead of a fabricated level;
//   - the as-of line renders the upstream's own timestamp in IST, and
//     says "as-of not disclosed" when the payload carried none (FD-15
//     wording class) — never the fetch time;
//   - both upstream parsers fail closed (zod) on any shape they were
//     not written for — an unparseable payload is the honest null.

import { describe, expect, it } from "vitest";
import {
  IndexStripRow,
  bseIndexLegFromRealtimeIndex,
  deriveIndexStripSnapshot,
  indexStripRowsFace,
  nseIndexLegFromAllIndices,
} from "@/lib/markets/indexStrip";

const ISO = "2026-10-14T08:14:00.000Z"; // 13:44 IST (session hours)

describe("INDEXSTRIP: derivation keeps each leg's own source and order", () => {
  it("emits the NIFTY row (nse) then the SENSEX row (bse)", () => {
    const snap = deriveIndexStripSnapshot(
      { value: 81742.33, changePct: -0.15, observedAt: ISO },
      { value: 26742.55, changePct: 0.12, observedAt: ISO },
      ISO,
    );
    expect(snap.rows.map(r => [r.symbol, r.source])).toEqual([
      ["NIFTY 50", "nse"],
      ["SENSEX", "bse"],
    ]);
    expect(snap.derivation).toContain("NSE");
    expect(snap.derivation).toContain("BSE");
  });

  it("drops a leg with no observation — no fabricated row, no fabricated level", () => {
    const snap = deriveIndexStripSnapshot(null, { value: 26742.55, changePct: null, observedAt: null }, ISO);
    expect(snap.rows.map(r => r.symbol)).toEqual(["SENSEX"]);
  });

  it("emits zero rows when both legs are null (the panel's empty state case)", () => {
    const snap = deriveIndexStripSnapshot(null, null, ISO);
    expect(snap.rows).toEqual([]);
  });
});

describe("INDEXSTRIP: the face renders nulls as em dashes and labels from the row's own source", () => {
  it("renders '—' for a missing change — never 0 or 0.00% (P0-2)", () => {
    const rows: IndexStripRow[] = [
      { symbol: "NIFTY 50", source: "nse", value: 81742.33, changePct: null, observedAt: null },
    ];
    const face = indexStripRowsFace(rows);
    expect(face[0].changeText).toBe("—");
    expect(face[0].changeText).not.toContain("0");
  });

  it("renders '—' for a missing level even when the change is disclosed", () => {
    const face = indexStripRowsFace([
      { symbol: "SENSEX", source: "bse", value: null, changePct: 0.12, observedAt: null },
    ]);
    expect(face[0].valueText).toBe("—");
    expect(face[0].changeText).toBe("+0.12%");
  });

  it("labels from row.source — a BSE-sourced row can never read 'Source: NSE'", () => {
    const face = indexStripRowsFace([
      { symbol: "NIFTY 50", source: "bse", value: 1, changePct: 0, observedAt: null },
      { symbol: "SENSEX", source: "nse", value: 1, changePct: 0, observedAt: null },
    ]);
    expect(face[0].sourceLabel).toBe("Source: BSE");
    expect(face[1].sourceLabel).toBe("Source: NSE");
  });

  it("renders the as-of in IST from the upstream timestamp — never the fetch time; 'as-of not disclosed' when absent", () => {
    const face = indexStripRowsFace([
      { symbol: "NIFTY 50", source: "nse", value: 1, changePct: 0, observedAt: "2026-10-14T08:14:00.000Z" }, // 13:44 IST
      { symbol: "SENSEX", source: "bse", value: 1, changePct: 0, observedAt: null },
    ]);
    expect(face[0].asOfText).toBe("13:44 IST");
    expect(face[1].asOfText).toBe("as-of not disclosed");
  });
});

describe("INDEXSTRIP: both parsers fail closed (R4 trust boundary)", () => {
  it("extracts NIFTY 50 from an allIndices-shaped payload; null when absent or malformed", () => {
    const payload = {
      timestamp: "14-Oct-2026 13:44:00",
      data: [
        { index: "NIFTY 50", indexSymbol: "NIFTY 50", last: 81742.33, percentChange: -0.15 },
        { index: "NIFTY BANK", indexSymbol: "NIFTY BANK", last: 25110.9, percentChange: 0.2 },
      ],
    };
    const leg = nseIndexLegFromAllIndices(payload);
    // parseNseTimestamp returns the UTC ISO instant (the movers contract);
    // 08:14:00Z == 13:44 IST.
    expect(leg).toEqual({ value: 81742.33, changePct: -0.15, observedAt: "2026-10-14T08:14:00.000Z" });
    expect(nseIndexLegFromAllIndices({ data: [] })).toBeNull();
    expect(nseIndexLegFromAllIndices({ unexpected: true })).toBeNull();
    expect(nseIndexLegFromAllIndices(null)).toBeNull();
  });

  it("accepts the BSE realtime-index shape with alias fields and rejects anything unparseable", () => {
    const leg = bseIndexLegFromRealtimeIndex({
      IndexName: "S&P BSE SENSEX",
      IndexValue: "26,742.55",
      Change: "32.15",
      PctChange: "0.12",
      LastUpdated: "14 Oct 2026 13:44:00",
    });
    expect(leg).not.toBeNull();
    expect(leg?.value).toBeCloseTo(26742.55, 2);
    expect(leg?.changePct).toBeCloseTo(0.12, 4);
    expect(bseIndexLegFromRealtimeIndex({ IndexName: "S&P BSE SENSEX" })).toBeNull();
    expect(bseIndexLegFromRealtimeIndex(null)).toBeNull();
    expect(bseIndexLegFromRealtimeIndex({ IndexValue: "not-a-number", PctChange: "0.1" })).toBeNull();
  });
});
