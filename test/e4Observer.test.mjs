import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  batchPricesRequestBody,
  extractUniverseKeys,
  nseSessionOpenAt,
} from "../scripts/e4SessionObserver.mjs";

/**
 * E4 observer (round 24) — pins for the two pure functions the acceptance
 * battery depends on. Fail-first lesson embedded: the FIRST universe regex
 * used `[A-Z0-9\-]+` and silently dropped J&KBANK, M&M and M&MFIN (893 vs
 * 896) — a mis-denominatored freshness gate. The pins below fail on exactly
 * that regression (verified RED before the character-class fix by running
 * the extraction with the old pattern).
 */

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const STOCKS_SOURCE = readFileSync(
  join(REPO, "data", "stocks", "index.ts"),
  "utf8",
);

describe("extractUniverseKeys", () => {
  it("extracts the full registry (896 keys at the 896-universe state)", () => {
    const keys = extractUniverseKeys(STOCKS_SOURCE);
    expect(keys.length).toBe(896);
  });

  it("keeps keys with non [A-Z0-9-] characters (the 893-key regression)", () => {
    const keys = extractUniverseKeys(STOCKS_SOURCE);
    expect(keys).toContain("J&KBANK");
    expect(keys).toContain("M&M");
    expect(keys).toContain("M&MFIN");
  });

  it("is order-preserving and duplicate-free", () => {
    const keys = extractUniverseKeys(STOCKS_SOURCE);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys[0]).toBe("360ONE");
    expect(keys[keys.length - 1]).toBe("ZYDUSWELL");
  });

  it("extracts nothing from an unrelated source (no false positives)", () => {
    expect(extractUniverseKeys("const x = 1;\n")).toEqual([]);
  });
});

describe("nseSessionOpenAt (IST 09:15-15:30 = UTC 03:45-10:00, Mon-Fri)", () => {
  const at = (day, h, m) => {
    // 2026-10-05 is a Monday; day offsets keep the weekday math explicit.
    const d = new Date(Date.UTC(2026, 9, 5 + day, h, m, 0));
    return nseSessionOpenAt(d);
  };
  it("opens at 03:45 UTC and closes at 10:00 UTC on weekdays", () => {
    expect(at(0, 3, 44)).toBe(false);
    expect(at(0, 3, 45)).toBe(true);
    expect(at(0, 9, 59)).toBe(true);
    expect(at(0, 10, 0)).toBe(false);
  });
  it("is closed on Saturday and Sunday at session mid-point", () => {
    expect(at(5, 6, 0)).toBe(false); // Saturday
    expect(at(6, 6, 0)).toBe(false); // Sunday
  });
  it("is open mid-session on each weekday", () => {
    for (const day of [0, 1, 2, 3, 4]) expect(at(day, 6, 30)).toBe(true);
  });
});

describe("batchPricesRequestBody (the U2 /api/prices/batch contract)", () => {
  // Fail-first lesson embedded (2026-10-08 04:29 early battery): the
  // instrument still sent the PRE-U2 bare-array body; every batch POST
  // got HTTP 400 "symbols array required" and the sweep recorded ALL
  // 896 symbols as 'unavailable' - an instrument failure masquerading
  // as a data state. The U2 route (6b02dd3) requires {"symbols": [...]}.
  it("sends the OBJECT form {symbols: [...]}, never a bare array", () => {
    const parsed = JSON.parse(batchPricesRequestBody(["BANKBARODA", "TCS"]));
    expect(Array.isArray(parsed)).toBe(false);
    expect(parsed).toEqual({ symbols: ["BANKBARODA", "TCS"] });
  });

  it("preserves order and duplicates inside symbols (no silent dedupe)", () => {
    const parsed = JSON.parse(batchPricesRequestBody(["TCS", "TCS", "ABC"]));
    expect(parsed.symbols).toEqual(["TCS", "TCS", "ABC"]);
  });
});
