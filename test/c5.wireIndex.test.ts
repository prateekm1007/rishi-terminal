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

  it("cuts the transport JSON to a fraction of the raw rows JSON", () => {
    const raw = JSON.stringify(rows).length;
    const wire = JSON.stringify(encodeSlimIndex(rows)).length;
    // Before the codec the "wire" IS the raw rows (100%); the legend form
    // must land well under half. Measured locally: ~11%.
    expect(wire).toBeLessThan(raw * 0.5);
  });

  it("dedupes verdict metadata into a small legend", () => {
    const wire = encodeSlimIndex(rows);
    expect(wire.legend.length).toBeGreaterThan(0);
    // Measured: 39 distinct metas (7 Rishis x their label variants) versus
    // 6,412 serialized verdict objects in the raw rows. Bound at 2x the
    // measured count so a new Rishi or label variant does not trip it.
    expect(wire.legend.length).toBeLessThanOrEqual(78);
    expect(wire.rows).toHaveLength(rows.length);
  });

  it("keeps every topBull/topBear/summaryScores score identical through the wire", () => {
    const wire = encodeSlimIndex(rows);
    for (let i = 0; i < rows.length; i++) {
      expect(wire.rows[i].topBull?.score).toBe(rows[i].topBull?.score ?? null);
      expect(wire.rows[i].topBear?.score).toBe(rows[i].topBear?.score ?? null);
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
