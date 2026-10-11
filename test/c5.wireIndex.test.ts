/**
 * R16 C5 — the RSC payload codec for the slim index.
 *
 * Founder Round-16 C5: "/screener ships 104 KB gzip and /lab 70 KB, so
 * slim the RSC payload to what's rendered." Forensics (before): /screener
 * flight = 855.8 kB raw / 56.9 kB gzip with `full` x6412, `label` x6412,
 * `origin` x4580 — the same ~7 verdict-metadata objects re-serialized for
 * every one of the 916 stocks.
 *
 * This suite pins the codec:
 *   - round-trip: decode(encode(rows)) equals rows, key-for-key, on the
 *     real universe (no data loss — the B-24 guard: rendered content
 *     cannot change)
 *   - transport budget: the wire JSON is dramatically smaller than the
 *     raw rows JSON (the point of the change)
 *   - legend dedup: the legend holds one entry per distinct verdict meta
 *   - the /screener + /chat projection carries NO verdict fields at all
 *     (what is not rendered does not ship) while keeping every flat field
 *     the table, stat pills, presets and picker read (positive control)
 */
import { describe, expect, it } from "vitest";
import {
  encodeSlimIndex,
  decodeSlimIndex,
  toScreenerRows,
} from "../lib/transport/slimWire";
import { getSlimIndex } from "../lib/scoring/slimIndex";

const rows = getSlimIndex();

describe("R16-C5 — slim-index wire codec", () => {
  it("round-trips the real universe key-for-key (rendered content cannot change)", () => {
    const decoded = decodeSlimIndex(encodeSlimIndex(rows));
    expect(decoded).toEqual(rows);
  });

  it("the wire never blows up the payload (P0-1 re-pin: within 5% of raw while the seed universe ships no verdict fields)", () => {
    const raw = JSON.stringify(rows).length;
    const wire = JSON.stringify(encodeSlimIndex(rows)).length;
    // Round-46 P0-1 (founder audit: "Seed rows show no verdict"): every
    // row's topBull/topBear/summaryScores are now empty/null, so the raw
    // JSON no longer contains the duplicated metadata the legend used to
    // dedupe (measured before P0-1: wire ≈ 11% of raw). On the current
    // universe the two forms are net-neutral (measured: +21 bytes of
    // envelope on ~273 kB, +0.008%) — the codec's job here is LOSSLESSNESS
    // (pinned above), and this bound guards against payload BLOWUP, never
    // fabricating a compression win the data no longer offers. When
    // verdicts return (live data), the original ratio compresses back.
    const growth = (wire - raw) / raw;
    expect(growth).toBeLessThan(0.05);
  });

  it("the legend holds one entry per distinct verdict meta (empty while the seed universe ships no verdict fields)", () => {
    const wire = encodeSlimIndex(rows);
    // P0-1: no row carries verdict metadata, so there is nothing to dedupe
    // — the legend is honestly empty. The bound below keeps its teeth for
    // the verdict-allowed future: one entry per distinct meta, 2x slack.
    const anyVerdictField = rows.some(r => r.topBull || r.topBear || r.summaryScores.length > 0);
    if (anyVerdictField) {
      expect(wire.legend.length).toBeGreaterThan(0);
      expect(wire.legend.length).toBeLessThanOrEqual(78);
    } else {
      expect(wire.legend.length).toBe(0);
    }
    expect(wire.rows).toHaveLength(rows.length);
  });

  it("keeps every topBull/topBear/summaryScores score identical through the wire (null included)", () => {
    const wire = encodeSlimIndex(rows);
    for (let i = 0; i < rows.length; i++) {
      expect(wire.rows[i].topBull?.score ?? null).toBe(rows[i].topBull?.score ?? null);
      expect(wire.rows[i].topBear?.score ?? null).toBe(rows[i].topBear?.score ?? null);
      expect(wire.rows[i].summaryScores.map((s) => s.score)).toEqual(
        rows[i].summaryScores.map((s) => s.score),
      );
    }
  });
});

describe("R16-C5 — the screener/chat projection ships what is rendered", () => {
  it("carries NO verdict, tension or fcf fields (not rendered by either surface)", () => {
    const projected = toScreenerRows(rows);
    const keys = new Set(projected.flatMap((r) => Object.keys(r)));
    expect(keys.has("topBull")).toBe(false);
    expect(keys.has("topBear")).toBe(false);
    expect(keys.has("summaryScores")).toBe(false);
    expect(keys.has("tension")).toBe(false);
    expect(keys.has("tensionSpread")).toBe(false);
    expect(keys.has("fcf")).toBe(false);
  });

  it("keeps every flat field the table, stat pills, presets and picker read (positive control)", () => {
    const projected = toScreenerRows(rows);
    expect(projected).toHaveLength(rows.length);
    for (let i = 0; i < rows.length; i++) {
      expect(projected[i].symbol).toBe(rows[i].symbol);
      expect(projected[i].name).toBe(rows[i].name);
      expect(projected[i].sector).toBe(rows[i].sector);
      expect(projected[i].consensus).toBe(rows[i].consensus);
      expect(projected[i].category).toBe(rows[i].category);
      expect(projected[i].dataQuality).toBe(rows[i].dataQuality);
      expect(projected[i].pe).toBe(rows[i].pe);
      expect(projected[i].roe).toBe(rows[i].roe);
      expect(projected[i].mktcap).toBe(rows[i].mktcap);
      expect(projected[i].de).toBe(rows[i].de);
      expect(projected[i].revcagr).toBe(rows[i].revcagr);
    }
  });
});
